import path from 'path';
import os from 'os';
import fsp from 'fs/promises';
import { createDirectory } from '../fileUtils/createDirectory';
import { createFile } from '../fileUtils/createFile';
import { fetchItchGameProfile } from './fetchItchGameProfile';
import {
  describeGamePageHttpError,
  fetchWithTimeout,
  USER_AGENT,
} from './httpDownload';
import { DownloadGameParams, DownloadGameResponse, IItchRecord } from './types';

/** File extensions to look for when scanning JS files for asset references. */
const ASSET_EXTENSIONS =
  /\.(png|jpg|jpeg|gif|svg|webp|mp3|ogg|wav|m4a|flac|json|xml|atlas|fnt|wasm|css|glsl|vert|frag|bin|dat|tmx|tsx)$/i;

/**
 * Parse HTML for all src= and href= asset references.
 * Returns relative paths only (filters out external URLs and anchors).
 */
function toGameRelativeRef(
  ref: string,
  referrerUrl: URL,
  gameBaseUrl: URL,
): string | undefined {
  const normalized = ref.trim().replace(/&amp;/g, '&');
  if (
    !normalized ||
    normalized.startsWith('data:') ||
    normalized.startsWith('blob:') ||
    normalized.startsWith('#') ||
    normalized.startsWith('javascript:')
  ) {
    return undefined;
  }

  try {
    const resolved = new URL(normalized, referrerUrl);
    if (resolved.origin !== gameBaseUrl.origin) return undefined;
    if (!resolved.pathname.startsWith(gameBaseUrl.pathname)) return undefined;

    const relativePath = resolved.pathname.slice(gameBaseUrl.pathname.length);
    if (!relativePath || relativePath.endsWith('/')) return undefined;
    return relativePath + resolved.search;
  } catch {
    return undefined;
  }
}

function parseAssetRefs(
  html: string,
  indexUrl: URL,
  gameBaseUrl: URL,
): string[] {
  const refs: string[] = [];
  // Only inspect actual resource-bearing opening tags. Skip complete inline
  // script/style bodies so a bundled single-file game can contain hundreds of
  // megabytes of JavaScript without us scanning its string literals as markup.
  const tagPattern = /<(script|style|link|img|audio|video|source|track|object)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(html)) !== null) {
    const tagEnd = html.indexOf('>', match.index);
    if (tagEnd === -1) break;

    const tagName = match[1].toLowerCase();
    const openingTag = html.slice(match.index, tagEnd + 1);
    const attribute = openingTag.match(
      /\s(?:src|href|data)\s*=\s*(?:"([^"]*)"|'([^']*)')/i,
    );
    const relativeRef = attribute
      ? toGameRelativeRef(attribute[1] ?? attribute[2], indexUrl, gameBaseUrl)
      : undefined;
    if (relativeRef) refs.push(relativeRef);

    tagPattern.lastIndex = tagEnd + 1;
    if (tagName === 'script' || tagName === 'style') {
      const closingTag = `</${tagName}`;
      const closingStart = html.indexOf(closingTag, tagEnd + 1);
      if (closingStart !== -1) {
        const closingEnd = html.indexOf('>', closingStart + closingTag.length);
        tagPattern.lastIndex = closingEnd === -1 ? html.length : closingEnd + 1;
      }
    }
  }
  return refs;
}

/**
 * Scan JavaScript source for quoted strings that look like asset paths.
 */
function scanJsForAssets(
  jsContent: string,
  jsUrl: URL,
  gameBaseUrl: URL,
): string[] {
  const assets: string[] = [];
  // Match quoted strings (single or double) containing asset-like paths
  const matches = jsContent.matchAll(/["']([a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)["']/g);
  for (const m of matches) {
    const candidate = m[1];
    if (ASSET_EXTENSIONS.test(candidate) && !candidate.startsWith('http') && !candidate.includes('://')) {
      const relativeRef = toGameRelativeRef(candidate, jsUrl, gameBaseUrl);
      if (relativeRef) assets.push(relativeRef);
    }
  }
  return assets;
}

function extractHtml5IndexUrl(pageHtml: string): URL | undefined {
  const normalizedHtml = pageHtml
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
  const match = normalizedHtml.match(
    /https:\/\/(?:html-classic\.)?itch\.zone\/html\/\d+\/index\.html(?:\?[^"'<>\s]*)?/i,
  );
  if (!match) return undefined;

  try {
    return new URL(match[0]);
  } catch {
    return undefined;
  }
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
      return {
        status: false,
        message: describeGamePageHttpError(pageRes.status),
        httpStatus: pageRes.status,
        failReason: 'page_unavailable',
      };
    }
    const pageHtml = await pageRes.text();

    const indexUrl = extractHtml5IndexUrl(pageHtml);
    if (!indexUrl) {
      return {
        status: false,
        message: 'Not an HTML5 web game — no embedded iframe found.',
        failReason: 'not_html5',
      };
    }

    const baseUrl = new URL('./', indexUrl);

    // Determine game name for the output folder
    const urlName = itchGameUrl.split('/').pop() || `html5-game`;
    const gameDir = path.join(downloadDirectory, urlName);
    await createDirectory({ directory: gameDir });

    // Step 2: GET index.html
    const indexRes = await fetchWithTimeout(indexUrl.toString(), { headers: { 'User-Agent': USER_AGENT } });
    if (!indexRes.ok) {
      return { status: false, message: `index.html returned HTTP ${indexRes.status}`, httpStatus: indexRes.status };
    }
    const indexHtml = await indexRes.text();

    // Step 3: Parse asset references from HTML
    const htmlAssets = parseAssetRefs(indexHtml, indexUrl, baseUrl);

    // Step 4: Scan JS files for additional asset references
    const jsFiles = htmlAssets.filter((asset) => {
      try {
        return new URL(asset, baseUrl).pathname.endsWith('.js');
      } catch {
        return false;
      }
    });
    const jsDiscoveredAssets: string[] = [];

    for (const jsFile of jsFiles) {
      try {
        const jsUrl = new URL(jsFile, baseUrl);
        const jsRes = await fetchWithTimeout(jsUrl.toString(), { headers: { 'User-Agent': USER_AGENT } });
        if (jsRes.ok) {
          const jsContent = await jsRes.text();
          jsDiscoveredAssets.push(...scanJsForAssets(jsContent, jsUrl, baseUrl));
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
        const localAssetPath = assetPath.split(/[?#]/, 1)[0];
        // Guard against directory traversal in asset paths
        const resolvedAsset = path.resolve(gameDir, localAssetPath);
        if (
          resolvedAsset !== gameDir &&
          !resolvedAsset.startsWith(gameDir + path.sep)
        ) {
          failures.push(`${assetPath} (path traversal blocked)`);
          continue;
        }

        const assetUrl = new URL(assetPath, baseUrl).toString();
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
        downloaded.push(localAssetPath);

        if (onProgress) {
          onProgress({
            bytesReceived: totalBytes,
            totalBytes: undefined,
            fileName: localAssetPath,
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
    totalBytes += Buffer.byteLength(indexHtml);

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
