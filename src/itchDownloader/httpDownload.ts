import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { DownloadProgress } from './types';

/**
 * Convert a fetch Response body into a Node Readable stream.
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
 * Stream a fetch Response body to a file on disk.
 */
export async function streamToFile(
  res: Response,
  filePath: string,
  onProgress?: (info: DownloadProgress) => void,
): Promise<void> {
  const total = Number(res.headers.get('content-length') || '0') || undefined;
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const writeStream = fs.createWriteStream(filePath);
  const readable = responseToReadable(res);
  let bytes = 0;
  if (onProgress) {
    readable.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      onProgress({ bytesReceived: bytes, totalBytes: total, fileName: path.basename(filePath) });
    });
  }
  await pipeline(readable, writeStream);
}

/**
 * Stream a fetch Response body into a Buffer in memory.
 */
export async function streamToBuffer(
  res: Response,
  onProgress?: (info: DownloadProgress) => void,
  fileName?: string,
): Promise<Buffer> {
  const total = Number(res.headers.get('content-length') || '0') || undefined;
  const readable = responseToReadable(res);
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of readable) {
    const buf = Buffer.from(chunk);
    chunks.push(buf);
    bytes += buf.length;
    if (onProgress) {
      onProgress({ bytesReceived: bytes, totalBytes: total, fileName });
    }
  }
  return Buffer.concat(chunks);
}
