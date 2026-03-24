import fs from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { streamToFile, streamToBuffer } from '../httpDownload';

/**
 * Create a mock Response object with a Node Readable body stream.
 */
function makeMockResponse(
  data: Buffer,
  headers: Record<string, string> = {},
): Response {
  const readable = Readable.from(data);
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    body: readable,
  } as unknown as Response;
}

describe('httpDownload', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'http-dl-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  });

  it('streamToFile writes data to disk', async () => {
    const content = Buffer.from('hello world from streamToFile');
    const filePath = path.join(tmpDir, 'output.bin');

    const res = makeMockResponse(content, {
      'content-length': String(content.length),
    });
    await streamToFile(res, filePath);

    expect(fs.existsSync(filePath)).toBe(true);
    const written = fs.readFileSync(filePath);
    expect(written.toString()).toBe('hello world from streamToFile');
  });

  it('streamToBuffer returns buffer with correct content', async () => {
    const content = Buffer.from('buffer test data');
    const res = makeMockResponse(content);

    const result = await streamToBuffer(res);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toBe('buffer test data');
  });

  it('streamToFile creates parent directories', async () => {
    const content = Buffer.from('nested');
    const filePath = path.join(tmpDir, 'sub', 'dir', 'file.bin');

    const res = makeMockResponse(content);
    await streamToFile(res, filePath);

    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath).toString()).toBe('nested');
  });

  it('onProgress fires during streamToFile', async () => {
    const content = Buffer.from('progress-test-data');
    const filePath = path.join(tmpDir, 'progress.bin');
    const onProgress = jest.fn();

    const res = makeMockResponse(content, {
      'content-length': String(content.length),
    });
    await streamToFile(res, filePath, onProgress);

    expect(onProgress).toHaveBeenCalled();
    // Last call should have bytesReceived equal to total data length
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
    expect(lastCall.bytesReceived).toBe(content.length);
    expect(lastCall.totalBytes).toBe(content.length);
    expect(lastCall.fileName).toBe('progress.bin');
  });

  it('onProgress fires during streamToBuffer', async () => {
    const content = Buffer.from('buffer-progress');
    const onProgress = jest.fn();

    const res = makeMockResponse(content);
    const result = await streamToBuffer(res, onProgress, 'test.dat');

    expect(onProgress).toHaveBeenCalled();
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
    expect(lastCall.bytesReceived).toBe(content.length);
    expect(lastCall.fileName).toBe('test.dat');
    expect(result.toString()).toBe('buffer-progress');
  });

  it('streamToFile handles empty response body gracefully', async () => {
    const content = Buffer.alloc(0);
    const filePath = path.join(tmpDir, 'empty.bin');

    const res = makeMockResponse(content);
    await streamToFile(res, filePath);

    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath).length).toBe(0);
  });

  it('streamToFile returns StreamResult with verification info', async () => {
    const content = Buffer.from('verified content');
    const filePath = path.join(tmpDir, 'result.bin');

    const res = makeMockResponse(content, {
      'content-length': String(content.length),
    });
    const result = await streamToFile(res, filePath);

    expect(result).toHaveProperty('bytesWritten', content.length);
    expect(result).toHaveProperty('expectedBytes', content.length);
    expect(result).toHaveProperty('verified', true);
  });

  it('streamToFile returns verified=true when no Content-Length', async () => {
    const content = Buffer.from('no CL header');
    const filePath = path.join(tmpDir, 'nocl.bin');

    const res = makeMockResponse(content);
    const result = await streamToFile(res, filePath);

    expect(result.verified).toBe(true);
    expect(result.expectedBytes).toBeUndefined();
    expect(result.bytesWritten).toBe(content.length);
  });

  it('streamToBuffer throws on Content-Length mismatch', async () => {
    const content = Buffer.from('short');
    const res = makeMockResponse(content, {
      'content-length': '9999',
    });

    await expect(streamToBuffer(res)).rejects.toThrow('Size mismatch');
  });

  it('streamToBuffer validates Content-Length match', async () => {
    const content = Buffer.from('exact match');
    const res = makeMockResponse(content, {
      'content-length': String(content.length),
    });

    const result = await streamToBuffer(res);
    expect(result.toString()).toBe('exact match');
    expect(result.length).toBe(content.length);
  });
});
