import path from 'path';
import os from 'os';
import fsp from 'fs/promises';
import { createDirectory } from '../fileUtils/createDirectory';
import { createFile } from '../fileUtils/createFile';
import { fetchItchGameProfile } from './fetchItchGameProfile';
import { fetchWithTimeout } from './httpDownload';
import { DownloadGameParams, DownloadGameResponse, IItchRecord } from './types';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

/** File extensions to look for when scanning JS files for asset references. */
const ASSET_EXTENSIONS =
  /\.(png|jpg|jpeg|gif|svg|webp|mp3|ogg|wav|m4a|flac|json|xml|atlas|fnt|wasm|css|glsl|vert|frag|bin|dat|tmx|tsx)$/i;

/**
 * Parse HTML for all src= and href= asset references.
 * Returns relative paths only (filters out external URLs and anchors).
 */
function parseAssetRefs(html: string, baseHost: string): string[] {
  const refs: string[] = [];
  const matches = html.matchAll(/(?:src|href)="([^"]+)"/g);
  for (const m of matches) {
    const ref = m[1];
    // Skip external URLs, data URIs, anchors, and javascript:
    if (ref.startsWith('http://') || ref.startsWith('https://')) {
      try {
        const url = new URL(ref);
        if (url.hostname !== baseHost) continue;
        // Extract relative path from absolute URL on same host
        refs.push(url.pathname.split('/').slice(3).join('/'));
      } catch {
        continue;
      }
    } else if (ref.startsWith('data:') || ref.startsWith('#') || ref.startsWith('javascript:')) {
      continue;
    } else {
      // Normalize: strip leading ./
      refs.push(ref.replace(/^\.\//, ''));
    }
  }
  return refs;
}

/**
 * Scan JavaScript source for quoted strings that look like asset paths.
 */
function scanJsForAssets(jsContent: string): string[] {
  const assets: string[] = [];
  // Match quoted strings (single or double) containing asset-like paths
  const matches = jsContent.matchAll(/["']([a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)["']/g);
  for (const m of matches) {
    const candidate = m[1];
    if (ASSET_EXTENSIONS.test(candidate) && !candidate.startsWith('http') && !candidate.includes('://')) {
      assets.push(candidate.replace(/^\.\//, ''));
    }
  }
  return assets;
}

/**
 * Download an HTML5 web game from itch.io for offline play.
 *
 * Scrapes the embedded iframe URL (itch.zone/html/{id}/index.html),
 * downloads index.html + all referenced assets, and saves them locally
 * with directory structure preserved.
 */
export async function downloadGameHtml5(
  params: DownloadGameParams,
): Promise<DownloadGameResponse> {
  const {
    name,
    author,
    itchGameUrl: inputUrl,
    downloadDirectory: inputDirectory,
    writeMetaData = true,
    onProgress,
  } = params;

  let itchGameUrl: string | undefined = inputUrl;
  if (!itchGameUrl && name && author) {
    itchGameUrl = `https://${author}.itch.io/${name.toLowerCase().replace(/\s+/g, '-')}`;
  }
  if (!itchGameUrl) {
    return { status: false, message: 'Invalid input: Provide either a URL or both name and author.' };
  }

  const downloadDirectory = inputDirectory
    ? path.resolve(inputDirectory)
    : path.resolve(os.homedir(), 'downloads');

  try {
    // Step 1: GET game page → find HTML5 iframe URL
    const pageRes = await fetchWithTimeout(itchGameUrl, { headers: { 'User-Agent': USER_AGENT } });
    if (!pageRes.ok) {
      return { status: false, message: `Game page returned HTTP ${pageRes.status}`, httpStatus: pageRes.status };
    }
    const pageHtml = await pageRes.text();

    const iframeMatch = pageHtml.match(/(?:html-classic\.)?itch\.zone\/html\/(\d+)\/index\.html/);
    if (!iframeMatch) {
      return { status: false, message: 'Not an HTML5 web game — no embedded iframe found.' };
    }

    const htmlId = iframeMatch[1];
    const baseUrl = `https://html-classic.itch.zone/html/${htmlId}/`;

    // Determine game name for the output folder
    const urlName = itchGameUrl.split('/').pop() || `html5-${htmlId}`;
    const gameDir = path.join(downloadDirectory, urlName);
    await createDirectory({ directory: gameDir });

    // Step 2: GET index.html
    const indexRes = await fetchWithTimeout(`${baseUrl}index.html`, { headers: { 'User-Agent': USER_AGENT } });
    if (!indexRes.ok) {
      return { status: false, message: `index.html returned HTTP ${indexRes.status}`, httpStatus: indexRes.status };
    }
    const indexHtml = await indexRes.text();

    // Step 3: Parse asset references from HTML
    const baseHost = new URL(baseUrl).hostname;
    const htmlAssets = parseAssetRefs(indexHtml, baseHost);

    // Step 4: Scan JS files for additional asset references
    const jsFiles = htmlAssets.filter((a) => a.endsWith('.js') && !a.startsWith('http'));
    const jsDiscoveredAssets: string[] = [];

    for (const jsFile of jsFiles) {
      try {
        const jsRes = await fetchWithTimeout(`${baseUrl}${jsFile}`, { headers: { 'User-Agent': USER_AGENT } });
        if (jsRes.ok) {
          const jsContent = await jsRes.text();
          jsDiscoveredAssets.push(...scanJsForAssets(jsContent));
        }
      } catch {
        // Non-critical — skip JS scanning failures
      }
    }

    // Deduplicate all assets
    const allAssets = [...new Set([...htmlAssets, ...jsDiscoveredAssets])];

    // Step 5: Download all assets
    const downloaded: string[] = [];
    let totalBytes = 0;
    const failures: string[] = [];

    for (const assetPath of allAssets) {
      try {
        // Guard against directory traversal in asset paths
        const resolvedAsset = path.resolve(gameDir, assetPath);
        if (!resolvedAsset.startsWith(gameDir)) {
          failures.push(`${assetPath} (path traversal blocked)`);
          continue;
        }

        const assetUrl = `${baseUrl}${assetPath}`;
        const assetRes = await fetchWithTimeout(assetUrl, { headers: { 'User-Agent': USER_AGENT } });
        if (!assetRes.ok) {
          failures.push(`${assetPath} (HTTP ${assetRes.status})`);
          continue;
        }

        const assetDir = path.dirname(resolvedAsset);
        await fsp.mkdir(assetDir, { recursive: true });

        const assetFilePath = resolvedAsset;
        const expectedSize = Number(assetRes.headers.get('content-length') || '0') || undefined;
        const buffer = Buffer.from(await assetRes.arrayBuffer());
        if (expectedSize && buffer.length !== expectedSize) {
          failures.push(`${assetPath} (size mismatch: expected ${expectedSize}, got ${buffer.length})`);
          continue;
        }
        await fsp.writeFile(assetFilePath, buffer);

        totalBytes += buffer.length;
        downloaded.push(assetPath);

        if (onProgress) {
          onProgress({
            bytesReceived: totalBytes,
            totalBytes: undefined,
            fileName: assetPath,
          });
        }
      } catch {
        failures.push(assetPath);
      }
    }

    // Step 6: Save index.html
    const indexPath = path.join(gameDir, 'index.html');
    await fsp.writeFile(indexPath, indexHtml, 'utf-8');
    downloaded.push('index.html');

    // Fetch and write metadata
    const profile = await fetchItchGameProfile({ itchGameUrl }).catch(() => null);
    const record = profile?.itchRecord as IItchRecord | undefined;

    const metadataPath = record
      ? path.join(gameDir, `${record.name || urlName}-metadata.json`)
      : undefined;
    if (writeMetaData && metadataPath && record) {
      await createFile({ filePath: metadataPath, content: JSON.stringify(record, null, 2) });
    }

    const failureNote = failures.length > 0
      ? ` (${failures.length} asset(s) failed: ${failures.slice(0, 3).join(', ')}${failures.length > 3 ? '...' : ''})`
      : '';

    return {
      status: true,
      message: `HTML5 game downloaded: ${downloaded.length} assets${failureNote}.`,
      filePath: indexPath,
      metadataPath,
      metaData: record,
      html5Assets: downloaded,
      sizeVerified: failures.length === 0,
      bytesDownloaded: totalBytes,
    };
  } catch (error: unknown) {
    return {
      status: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
