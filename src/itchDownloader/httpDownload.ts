import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { DownloadProgress } from './types';

/** Default timeout for HTTP requests (30 seconds). */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Shared User-Agent for all itch.io HTTP requests. Update this single constant when needed. */
export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

/**
 * Fetch with an automatic timeout via AbortController.
 * Prevents indefinite hangs on unresponsive servers.
 */
export function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

/** Result returned by streamToFile with verification info. */
export interface StreamResult {
  bytesWritten: number;
  expectedBytes?: number;
  verified: boolean;
  /** Whether the download was resumed from a partial file */
  resumed?: boolean;
}

/**
 * Convert a fetch Response body into a Node Readable stream.
 * Returns an empty stream if body is null (e.g., 204 No Content).
 */
function responseToReadable(res: Response): Readable {
  if (res.body && typeof (res.body as ReadableStream).getReader === 'function') {
    return Readable.fromWeb(res.body as import('stream/web').ReadableStream);
  } else if (res.body) {
    return res.body as unknown as Readable;
  }
  return Readable.from(Buffer.alloc(0));
}

/**
 * Safely invoke onProgress, catching any exceptions it throws
 * to prevent breaking the download stream.
 */
function safeProgress(
  onProgress: ((info: DownloadProgress) => void) | undefined,
  info: DownloadProgress,
): void {
  if (!onProgress) return;
  try {
    onProgress(info);
  } catch {
    // Progress callback errors must not break downloads
  }
}

/**
 * Stream a fetch Response body to a file on disk.
 * Returns verification info (bytes written vs Content-Length).
 *
 * When `resumeFrom` is provided, appends to the file starting at that offset.
 */
export async function streamToFile(
  res: Response,
  filePath: string,
  onProgress?: (info: DownloadProgress) => void,
  resumeFrom?: number,
): Promise<StreamResult> {
  const rawCL = Number(res.headers.get('content-length') || '0');
  const contentLength = Number.isFinite(rawCL) && rawCL > 0 ? rawCL : undefined;
  const expectedBytes = resumeFrom && contentLength ? resumeFrom + contentLength : contentLength;
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const writeStream = fs.createWriteStream(filePath, resumeFrom ? { flags: 'a' } : undefined);
  const readable = responseToReadable(res);
  let bytes = resumeFrom || 0;
  readable.on('data', (chunk: Buffer) => {
    bytes += chunk.length;
    safeProgress(onProgress, {
      bytesReceived: bytes,
      totalBytes: expectedBytes,
      fileName: path.basename(filePath),
    });
  });
  await pipeline(readable, writeStream);

  const verified = expectedBytes ? bytes === expectedBytes : true;
  return { bytesWritten: bytes, expectedBytes, verified };
}

/**
 * Stream a fetch Response body into a Buffer in memory.
 * Returns buffer and verification info.
 */
export async function streamToBuffer(
  res: Response,
  onProgress?: (info: DownloadProgress) => void,
  fileName?: string,
): Promise<Buffer> {
  const rawTotal = Number(res.headers.get('content-length') || '0');
  const total = Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : undefined;
  const readable = responseToReadable(res);
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of readable) {
    const buf = Buffer.from(chunk);
    chunks.push(buf);
    bytes += buf.length;
    safeProgress(onProgress, { bytesReceived: bytes, totalBytes: total, fileName });
  }
  const buffer = Buffer.concat(chunks);
  if (total && buffer.length !== total) {
    throw new Error(
      `Size mismatch: expected ${total} bytes but received ${buffer.length} bytes`,
    );
  }
  return buffer;
}

/**
 * Download a URL to a file with resume support.
 *
 * If a .part file exists from a previous interrupted download, sends a Range
 * header to resume from where it left off. On success, renames .part → final.
 *
 * @returns StreamResult with verification info
 */
export async function downloadWithResume(
  url: string,
  filePath: string,
  headers: Record<string, string> = {},
  onProgress?: (info: DownloadProgress) => void,
): Promise<StreamResult> {
  const partPath = filePath + '.part';
  let resumeFrom = 0;

  // Check for existing partial download
  try {
    const stat = await fsp.stat(partPath);
    resumeFrom = stat.size;
  } catch {
    // No partial file — start fresh
  }

  const reqHeaders: Record<string, string> = { ...headers };
  if (resumeFrom > 0) {
    reqHeaders['Range'] = `bytes=${resumeFrom}-`;
  }

  // Use a longer timeout for downloads (5 minutes) since large files take time
  const res = await fetchWithTimeout(url, { headers: reqHeaders }, 5 * 60 * 1000);

  // If server doesn't support Range (200 instead of 206), start fresh
  if (resumeFrom > 0 && res.status !== 206) {
    resumeFrom = 0;
  }

  if (!res.ok && res.status !== 206) {
    throw new Error(`Download failed HTTP ${res.status}`);
  }

  const didResume = resumeFrom > 0;
  const result = await streamToFile(res, partPath, onProgress, didResume ? resumeFrom : undefined);

  // Verify size if Content-Length was known
  if (result.expectedBytes && !result.verified) {
    // Keep the .part file for potential future resume
    throw new Error(
      `Size mismatch: expected ${result.expectedBytes} bytes but got ${result.bytesWritten}. Partial file kept at ${partPath}`,
    );
  }

  // Success — rename .part → final
  await fsp.rename(partPath, filePath);
  return { ...result, resumed: didResume };
}
