import path from 'path';
import os from 'os';
import fs from 'fs';
import { createFile } from '../fileUtils/createFile';
import { createDirectory } from '../fileUtils/createDirectory';
import { renameFile } from '../fileUtils/renameFile';
import { fetchItchGameProfile } from './fetchItchGameProfile';
import { streamToFile, streamToBuffer, downloadWithResume } from './httpDownload';
import { getCachedCookies, setCachedCookies, mergeCookies } from './cookieCache';
import { DownloadGameParams, DownloadGameResponse, IItchRecord } from './types';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

interface UploadInfo {
  id: string;
  name: string;
}

interface PageInfo {
  csrfToken: string;
  uploadIds: string[];
  uploadInfos: UploadInfo[];
  cookies: string;
  minPrice: number;
}

/**
 * Extract page info from an itch.io game page HTML response.
 */
function parsePage(html: string, res: Response): PageInfo {
  const csrfMatch = html.match(/csrf_token" value="([^"]+)/);
  const uploadMatches = [...html.matchAll(/data-upload_id="(\d+)/g)];
  const priceMatch = html.match(/"min_price":(\d+)/);

  // Parse upload info: extract upload IDs with their associated display names
  const uploadInfos = [...html.matchAll(/<a[^>]*data-upload_id="(\d+)"[^>]*>[\s\S]*?<strong[^>]*class="name"[^>]*>([^<]+)<\/strong>/g)]
    .map(m => ({ id: m[1], name: m[2].trim() }));

  const setCookies: string[] = [];
  // getSetCookie exists on Node 20+; fall back to get('set-cookie')
  if (typeof res.headers.getSetCookie === 'function') {
    setCookies.push(...res.headers.getSetCookie());
  } else {
    const raw = res.headers.get('set-cookie');
    if (raw) setCookies.push(...raw.split(', '));
  }
  const cookies = setCookies.map((c) => c.split(';')[0]).join('; ');

  return {
    csrfToken: csrfMatch?.[1] || '',
    uploadIds: uploadMatches.map((m) => m[1]),
    uploadInfos,
    cookies,
    minPrice: Number(priceMatch?.[1] ?? '0'),
  };
}

/**
 * Download a free itch.io game using direct HTTP requests — no Puppeteer, no API key.
 *
 * Flow:
 * 1. GET game page → extract CSRF, upload IDs, cookies, price
 * 2. POST /download_url → signed download page URL
 * 3. GET download page → fresh CSRF + upload IDs
 * 4. POST /file/{uploadId} → Cloudflare R2 CDN URL (60s TTL)
 * 5. Stream CDN URL to disk or memory
 *
 * Features:
 * - Cookie caching: reuses session cookies across downloads (disable with noCookieCache)
 * - Resume support: resumes interrupted downloads using Range headers (enable with resume)
 * - Size verification: validates Content-Length matches actual bytes downloaded
 */
export async function downloadGameDirect(
  params: DownloadGameParams,
): Promise<DownloadGameResponse> {
  const {
    name,
    author,
    desiredFileName,
    downloadDirectory: inputDirectory,
    itchGameUrl: inputUrl,
    inMemory,
    writeMetaData = true,
    onProgress,
    resume = false,
    cookieCacheDir,
    noCookieCache = false,
  } = params;

  if (desiredFileName && (desiredFileName.includes('/') || desiredFileName.includes('\\'))) {
    return { status: false, message: 'Invalid desiredFileName: must not contain path separators.' };
  }

  let itchGameUrl: string | undefined = inputUrl;
  if (!itchGameUrl && name && author) {
    itchGameUrl = `https://${author}.itch.io/${name.toLowerCase().replace(/\s+/g, '-')}`;
  }
  if (!itchGameUrl) {
    return { status: false, message: 'Invalid input: Provide either a URL or both name and author.' };
  }

  const downloadDirectory: string | undefined = inputDirectory
    ? path.resolve(inputDirectory)
    : inMemory
      ? undefined
      : path.resolve(os.homedir(), 'downloads');

  try {
    if (downloadDirectory) {
      await createDirectory({ directory: downloadDirectory });
    }

    // Check cookie cache for existing session
    let cachedSession: { cookies: string; csrfToken?: string } | null = null;
    if (!noCookieCache) {
      cachedSession = await getCachedCookies(itchGameUrl, cookieCacheDir);
    }

    // Step 1: GET game page
    const pageHeaders: Record<string, string> = { 'User-Agent': USER_AGENT };
    if (cachedSession?.cookies) {
      pageHeaders['Cookie'] = cachedSession.cookies;
    }

    const pageRes = await fetch(itchGameUrl, { headers: pageHeaders });
    if (!pageRes.ok) {
      return { status: false, message: `Game page returned HTTP ${pageRes.status}`, httpStatus: pageRes.status };
    }
    const pageHtml = await pageRes.text();
    const page = parsePage(pageHtml, pageRes);

    // Merge cached cookies with fresh response cookies
    const sessionCookies = cachedSession?.cookies
      ? mergeCookies(cachedSession.cookies, page.cookies)
      : page.cookies;

    if (!page.csrfToken) {
      return { status: false, message: 'Could not extract CSRF token from game page.', failReason: 'csrf_failed' };
    }

    // Cache the session cookies + CSRF for future downloads
    if (!noCookieCache) {
      await setCachedCookies(itchGameUrl, sessionCookies, page.csrfToken, cookieCacheDir).catch(() => {});
    }

    // Price gate — if min_price > 0 and no direct uploads visible, this is a paid game
    if (page.minPrice > 0 && page.uploadIds.length === 0) {
      return { status: false, message: `Game requires purchase (min price: ${page.minPrice} cents).`, failReason: 'paid' };
    }

    // If no uploads AND no donation wall (min_price=0), check if web-only
    if (page.uploadIds.length === 0 && page.minPrice === 0) {
      const isHtml5Only =
        pageHtml.includes('game_frame') || pageHtml.includes('html_embed');
      const hasPurchasePath = pageHtml.includes('/purchase');

      if (!hasPurchasePath && isHtml5Only) {
        return { status: false, message: 'web-only HTML5 game — no downloadable files.', failReason: 'web_only' };
      }
      if (!hasPurchasePath && !isHtml5Only) {
        return { status: false, message: 'No uploads found on game page.', failReason: 'no_uploads' };
      }
    }

    // Step 2: POST /download_url
    const body = page.uploadIds.length > 0
      ? `csrf_token=${encodeURIComponent(page.csrfToken)}&upload_id=${page.uploadIds[0]}`
      : `csrf_token=${encodeURIComponent(page.csrfToken)}`;

    const dlUrlRes = await fetch(`${itchGameUrl}/download_url`, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: itchGameUrl,
        Cookie: sessionCookies,
      },
      body,
    });
    if (!dlUrlRes.ok) {
      return { status: false, message: `download_url POST failed HTTP ${dlUrlRes.status}`, httpStatus: dlUrlRes.status };
    }
    const dlUrlData = (await dlUrlRes.json()) as { url?: string };
    if (!dlUrlData.url) {
      return { status: false, message: 'No download URL returned — game may require purchase.' };
    }

    // Step 3: GET download page
    const dlPageRes = await fetch(dlUrlData.url, {
      headers: { 'User-Agent': USER_AGENT, Cookie: sessionCookies },
    });
    if (!dlPageRes.ok) {
      return { status: false, message: `Download page returned HTTP ${dlPageRes.status}`, httpStatus: dlPageRes.status };
    }
    const dlPageHtml = await dlPageRes.text();
    const dlPage = parsePage(dlPageHtml, dlPageRes);

    // Merge cookies from download page
    const allCookies = mergeCookies(sessionCookies, dlPage.cookies);

    // Update cache with all accumulated cookies
    if (!noCookieCache) {
      await setCachedCookies(itchGameUrl, allCookies, dlPage.csrfToken || page.csrfToken, cookieCacheDir).catch(() => {});
    }

    // Use upload IDs from download page (more complete list)
    let uploadId: string | undefined;
    if (params.platform) {
      const platformLower = params.platform.toLowerCase();
      const infos = dlPage.uploadInfos.length > 0 ? dlPage.uploadInfos : page.uploadInfos;
      const matched = infos.find(u => u.name.toLowerCase().includes(platformLower));
      if (matched) {
        uploadId = matched.id;
      }
    }
    uploadId = uploadId || dlPage.uploadIds[0] || page.uploadIds[0];
    if (!uploadId) {
      return { status: false, message: 'No uploads found on download page.' };
    }

    const csrf = dlPage.csrfToken || page.csrfToken;

    // Step 4: POST /file/{uploadId} for CDN URL
    const fileRes = await fetch(`${itchGameUrl}/file/${uploadId}`, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: dlUrlData.url,
        Cookie: allCookies,
      },
      body: `csrf_token=${encodeURIComponent(csrf)}`,
    });
    if (!fileRes.ok) {
      return { status: false, message: `file/${uploadId} POST failed HTTP ${fileRes.status}`, httpStatus: fileRes.status };
    }
    const cdnData = (await fileRes.json()) as { url?: string; external?: boolean };
    if (!cdnData.url) {
      return { status: false, message: 'No CDN URL returned.' };
    }

    // Step 5: Stream CDN URL immediately (60s TTL)
    // Determine filename from a HEAD-like approach: fetch with stream
    let fileBuffer: Buffer | undefined;
    let finalFilePath = '';
    let sizeVerified = true;
    let bytesDownloaded = 0;
    let resumed = false;

    if (inMemory) {
      const cdnRes = await fetch(cdnData.url, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (!cdnRes.ok) {
        return { status: false, message: `CDN download failed HTTP ${cdnRes.status}`, httpStatus: cdnRes.status };
      }
      fileBuffer = await streamToBuffer(cdnRes, onProgress, `game-${uploadId}`);
      bytesDownloaded = fileBuffer.length;
    } else if (downloadDirectory) {
      // Get the CDN URL filename first via a HEAD-like initial fetch
      const cdnRes = await fetch(cdnData.url, {
        method: 'HEAD',
        headers: { 'User-Agent': USER_AGENT },
      });
      const disposition = cdnRes.headers.get('content-disposition');
      const dispositionMatch = disposition?.match(/filename="?([^";\n]+)"?/);
      const cdnFileName = dispositionMatch?.[1] || `game-${uploadId}.zip`;
      finalFilePath = path.join(downloadDirectory, cdnFileName);

      if (resume) {
        // Use resumable download
        const result = await downloadWithResume(
          cdnData.url,
          finalFilePath,
          { 'User-Agent': USER_AGENT },
          onProgress,
        );
        sizeVerified = result.verified;
        bytesDownloaded = result.bytesWritten;
        resumed = result.bytesWritten > (result.expectedBytes ? result.expectedBytes - (Number(cdnRes.headers.get('content-length')) || 0) : 0);
      } else {
        // Standard download with size verification
        const cdnDownloadRes = await fetch(cdnData.url, {
          headers: { 'User-Agent': USER_AGENT },
        });
        if (!cdnDownloadRes.ok) {
          return { status: false, message: `CDN download failed HTTP ${cdnDownloadRes.status}`, httpStatus: cdnDownloadRes.status };
        }
        const result = await streamToFile(cdnDownloadRes, finalFilePath, onProgress);
        sizeVerified = result.verified;
        bytesDownloaded = result.bytesWritten;
      }
    }

    // Rename/dedup if needed
    if (downloadDirectory && finalFilePath) {
      const originalBase = desiredFileName || path.basename(finalFilePath, path.extname(finalFilePath));
      const ext = path.extname(finalFilePath);
      let uniqueBase = originalBase;
      let uniquePath = path.join(downloadDirectory, uniqueBase + ext);
      let counter = 1;
      while (fs.existsSync(uniquePath) && uniquePath !== finalFilePath) {
        uniqueBase = `${originalBase}-${counter}`;
        uniquePath = path.join(downloadDirectory, uniqueBase + ext);
        counter++;
      }
      if (uniqueBase !== path.basename(finalFilePath, ext) || desiredFileName) {
        const renameResult = await renameFile({ filePath: finalFilePath, desiredFileName: uniqueBase });
        if (!renameResult.status) throw new Error('File rename failed: ' + renameResult.message);
        finalFilePath = renameResult.newFilePath as string;
      }
    }

    // Fetch metadata
    const profile = await fetchItchGameProfile({ itchGameUrl }).catch(() => null);
    const record = profile?.itchRecord as IItchRecord | undefined;

    const metadataPath = downloadDirectory && record
      ? path.join(downloadDirectory, `${record.name || 'game'}-metadata.json`)
      : undefined;
    if (writeMetaData && metadataPath && record) {
      await createFile({ filePath: metadataPath, content: JSON.stringify(record, null, 2) });
    }

    return {
      status: true,
      message: 'Download successful (direct HTTP).',
      filePath: downloadDirectory ? finalFilePath : undefined,
      metadataPath,
      metaData: record,
      fileBuffer,
      sizeVerified,
      bytesDownloaded,
      resumed,
    };
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    return {
      status: false,
      message: error instanceof Error ? error.message : String(error),
      httpStatus: err.statusCode as number | undefined,
    };
  }
}
