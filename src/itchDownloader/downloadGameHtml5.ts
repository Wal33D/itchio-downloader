import path from 'path';
import os from 'os';
import fs from 'fs';
import fsp from 'fs/promises';
import { createDirectory } from '../fileUtils/createDirectory';
import { createFile } from '../fileUtils/createFile';
import { fetchItchGameProfile } from './fetchItchGameProfile';
import {
  describeGamePageHttpError,
  fetchWithTimeout,
  streamToFile,
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

function assetRefFromTag(
  openingTag: string,
  tagName: string,
  indexUrl: URL,
  gameBaseUrl: URL,
): string | undefined {
  const attribute =
    tagName === 'link'
      ? openingTag.match(/\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
      : tagName === 'object'
        ? openingTag.match(/\sdata\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
        : openingTag.match(/\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  return attribute
    ? toGameRelativeRef(attribute[1] ?? attribute[2], indexUrl, gameBaseUrl)
    : undefined;
}

type Quote = '"' | "'" | undefined;

function scanTagEnd(
  value: string,
  initialQuote?: Quote,
  startIndex = 1,
): { endIndex: number; quote: Quote } {
  let quote = initialQuote;
  for (let index = startIndex; index < value.length; index++) {
    const char = value[index];
    if (quote) {
      if (char === quote) quote = undefined;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return { endIndex: index, quote };
    }
  }
  return { endIndex: -1, quote };
}

/**
 * Scan a saved HTML file incrementally so very large single-file games do not
 * need a second full in-memory copy just to discover their asset tags.
 */
async function parseAssetRefsFromFile(
  filePath: string,
  indexUrl: URL,
  gameBaseUrl: URL,
): Promise<string[]> {
  const refs: string[] = [];
  let buffer = '';
  let skippedTag: 'script' | 'style' | undefined;
  let oversizedTag:
    | { skippedTag?: 'script' | 'style'; quote: Quote }
    | undefined;
  const maximumBufferedTagBytes = 64 * 1024;

  const consume = (final: boolean): void => {
    while (buffer.length > 0) {
      if (oversizedTag) {
        const scan = scanTagEnd(buffer, oversizedTag.quote, 0);
        if (scan.endIndex === -1) {
          oversizedTag.quote = scan.quote;
          buffer = '';
          return;
        }
        buffer = buffer.slice(scan.endIndex + 1);
        skippedTag = oversizedTag.skippedTag;
        oversizedTag = undefined;
        continue;
      }

      if (skippedTag) {
        const closingMarker = `</${skippedTag}`;
        const closingStart = buffer.toLowerCase().indexOf(closingMarker);
        if (closingStart === -1) {
          buffer = final
            ? ''
            : buffer.slice(-Math.min(buffer.length, closingMarker.length - 1));
          return;
        }
        const closingEnd = scanTagEnd(buffer.slice(closingStart)).endIndex;
        if (closingEnd === -1) {
          buffer = final ? '' : buffer.slice(closingStart);
          return;
        }
        buffer = buffer.slice(closingStart + closingEnd + 1);
        skippedTag = undefined;
        continue;
      }

      const tagStart = buffer.indexOf('<');
      if (tagStart === -1) {
        buffer = final ? '' : buffer.slice(-1);
        return;
      }
      if (tagStart > 0) buffer = buffer.slice(tagStart);

      const tagScan = scanTagEnd(buffer);
      const tagEnd = tagScan.endIndex;
      if (tagEnd === -1) {
        if (final) {
          buffer = '';
        } else if (buffer.length > maximumBufferedTagBytes) {
          const match = buffer.match(/^<(script|style)\b/i);
          const tagName = match?.[1].toLowerCase();
          oversizedTag = {
            skippedTag:
              tagName === 'script' || tagName === 'style' ? tagName : undefined,
            quote: tagScan.quote,
          };
          buffer = '';
        }
        return;
      }

      const openingTag = buffer.slice(0, tagEnd + 1);
      buffer = buffer.slice(tagEnd + 1);
      const match = openingTag.match(
        /^<(script|style|link|img|audio|video|source|track|object)\b/i,
      );
      if (!match) continue;

      const tagName = match[1].toLowerCase();
      const relativeRef = assetRefFromTag(
        openingTag,
        tagName,
        indexUrl,
        gameBaseUrl,
      );
      if (relativeRef) refs.push(relativeRef);

      if (
        (tagName === 'script' || tagName === 'style') &&
        !/\/\s*>$/.test(openingTag)
      ) {
        skippedTag = tagName;
      }
    }
  };

  const input = fs.createReadStream(filePath, { encoding: 'utf8' });
  for await (const chunk of input) {
    buffer += chunk;
    consume(false);
  }
  consume(true);
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
  const matches = jsContent.matchAll(
    /["']([a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)["']/g,
  );
  for (const m of matches) {
    const candidate = m[1];
    if (
      ASSET_EXTENSIONS.test(candidate) &&
      !candidate.startsWith('http') &&
      !candidate.includes('://')
    ) {
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
  options: { pageHtml?: string } = {},
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
    return {
      status: false,
      message: 'Invalid input: Provide either a URL or both name and author.',
    };
  }

  const downloadDirectory = inputDirectory
    ? path.resolve(inputDirectory)
    : path.resolve(os.homedir(), 'downloads');

  try {
    // Step 1: GET game page → find HTML5 iframe URL. Auto-detection can pass
    // the page it already fetched so we do not duplicate a rate-limited request.
    let pageHtml = options.pageHtml;
    if (pageHtml === undefined) {
      const pageRes = await fetchWithTimeout(itchGameUrl, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (!pageRes.ok) {
        return {
          status: false,
          message: describeGamePageHttpError(pageRes.status),
          httpStatus: pageRes.status,
          failReason: 'page_unavailable',
        };
      }
      pageHtml = await pageRes.text();
    }

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
    const indexPath = path.join(gameDir, 'index.html');

    // Step 2: GET index.html
    const indexRes = await fetchWithTimeout(indexUrl.toString(), {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!indexRes.ok) {
      return {
        status: false,
        message: `index.html returned HTTP ${indexRes.status}`,
        httpStatus: indexRes.status,
      };
    }
    const indexResult = await streamToFile(indexRes, indexPath, onProgress);
    if (!indexResult.verified) {
      await fsp.rm(indexPath, { force: true });
      return {
        status: false,
        message: `index.html size mismatch: expected ${indexResult.expectedBytes}, got ${indexResult.bytesWritten}`,
      };
    }

    // Step 3: Parse asset references from HTML
    const htmlAssets = await parseAssetRefsFromFile(
      indexPath,
      indexUrl,
      baseUrl,
    );

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
        const jsRes = await fetchWithTimeout(jsUrl.toString(), {
          headers: { 'User-Agent': USER_AGENT },
        });
        if (jsRes.ok) {
          const jsContent = await jsRes.text();
          jsDiscoveredAssets.push(
            ...scanJsForAssets(jsContent, jsUrl, baseUrl),
          );
        }
      } catch {
        // Non-critical — skip JS scanning failures
      }
    }

    // Deduplicate all assets
    const allAssets = [...new Set([...htmlAssets, ...jsDiscoveredAssets])];

    // Step 5: Download all assets
    const downloaded: string[] = ['index.html'];
    let totalBytes = indexResult.bytesWritten;
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
        const assetRes = await fetchWithTimeout(assetUrl, {
          headers: { 'User-Agent': USER_AGENT },
        });
        if (!assetRes.ok) {
          failures.push(`${assetPath} (HTTP ${assetRes.status})`);
          continue;
        }

        const assetDir = path.dirname(resolvedAsset);
        await fsp.mkdir(assetDir, { recursive: true });

        const assetFilePath = resolvedAsset;
        const expectedSize =
          Number(assetRes.headers.get('content-length') || '0') || undefined;
        const priorBytes = totalBytes;
        const streamResult = await streamToFile(
          assetRes,
          assetFilePath,
          onProgress
            ? (info) =>
                onProgress({
                  ...info,
                  bytesReceived: priorBytes + info.bytesReceived,
                })
            : undefined,
        );
        if (!streamResult.verified) {
          await fsp.rm(assetFilePath, { force: true });
          failures.push(
            `${assetPath} (size mismatch: expected ${expectedSize}, got ${streamResult.bytesWritten})`,
          );
          continue;
        }

        totalBytes += streamResult.bytesWritten;
        downloaded.push(localAssetPath);
      } catch {
        failures.push(assetPath);
      }
    }

    // Fetch and write metadata
    const profile = await fetchItchGameProfile({ itchGameUrl }).catch(
      () => null,
    );
    const record = profile?.itchRecord as IItchRecord | undefined;

    const metadataPath = record
      ? path.join(gameDir, `${record.name || urlName}-metadata.json`)
      : undefined;
    if (writeMetaData && metadataPath && record) {
      await createFile({
        filePath: metadataPath,
        content: JSON.stringify(record, null, 2),
      });
    }

    const failureNote =
      failures.length > 0
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
