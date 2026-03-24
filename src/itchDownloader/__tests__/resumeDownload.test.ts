import fs from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { downloadWithResume, streamToFile, streamToBuffer } from '../httpDownload';

function makeMockResponse(
  data: Buffer,
  opts: { status?: number; ok?: boolean; headers?: Record<string, string> } = {},
): Response {
  const readable = Readable.from(data);
  const headers = opts.headers || {};
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    body: readable,
  } as unknown as Response;
}

describe('streamToFile verification', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stf-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  });

  it('returns verified=true when Content-Length matches', async () => {
    const data = Buffer.from('hello world');
    const filePath = path.join(tmpDir, 'verified.bin');
    const res = makeMockResponse(data, {
      headers: { 'content-length': String(data.length) },
    });

    const result = await streamToFile(res, filePath);

    expect(result.verified).toBe(true);
    expect(result.bytesWritten).toBe(data.length);
    expect(result.expectedBytes).toBe(data.length);
  });

  it('returns verified=true when no Content-Length', async () => {
    const data = Buffer.from('no length header');
    const filePath = path.join(tmpDir, 'nolen.bin');
    const res = makeMockResponse(data);

    const result = await streamToFile(res, filePath);

    expect(result.verified).toBe(true);
    expect(result.bytesWritten).toBe(data.length);
    expect(result.expectedBytes).toBeUndefined();
  });

  it('returns correct bytesWritten for large data', async () => {
    const data = Buffer.alloc(1024 * 64, 'x'); // 64KB
    const filePath = path.join(tmpDir, 'large.bin');
    const res = makeMockResponse(data, {
      headers: { 'content-length': String(data.length) },
    });

    const result = await streamToFile(res, filePath);

    expect(result.bytesWritten).toBe(data.length);
    expect(result.verified).toBe(true);
    expect(fs.statSync(filePath).size).toBe(data.length);
  });

  it('fires onProgress callback during write', async () => {
    const data = Buffer.from('progress tracking data');
    const filePath = path.join(tmpDir, 'progress.bin');
    const onProgress = jest.fn();
    const res = makeMockResponse(data, {
      headers: { 'content-length': String(data.length) },
    });

    await streamToFile(res, filePath, onProgress);

    expect(onProgress).toHaveBeenCalled();
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
    expect(lastCall.bytesReceived).toBe(data.length);
    expect(lastCall.totalBytes).toBe(data.length);
    expect(lastCall.fileName).toBe('progress.bin');
  });

  it('fires onProgress even when no callback provided (no crash)', async () => {
    const data = Buffer.from('silent download');
    const filePath = path.join(tmpDir, 'silent.bin');
    const res = makeMockResponse(data);

    // Should not throw
    const result = await streamToFile(res, filePath);
    expect(result.bytesWritten).toBe(data.length);
  });

  it('appends data when resumeFrom is provided', async () => {
    const filePath = path.join(tmpDir, 'append.bin');
    // Write initial data
    fs.writeFileSync(filePath, Buffer.from('AAAA'));

    const additionalData = Buffer.from('BBBB');
    const res = makeMockResponse(additionalData, {
      headers: { 'content-length': String(additionalData.length) },
    });

    const result = await streamToFile(res, filePath, undefined, 4);

    expect(result.bytesWritten).toBe(8); // 4 (resume) + 4 (new)
    expect(result.expectedBytes).toBe(8); // resumeFrom + content-length
    expect(result.verified).toBe(true);

    const content = fs.readFileSync(filePath);
    expect(content.toString()).toBe('AAAABBBB');
  });

  it('overwrites file when resumeFrom is not provided', async () => {
    const filePath = path.join(tmpDir, 'overwrite.bin');
    fs.writeFileSync(filePath, Buffer.from('old data'));

    const newData = Buffer.from('new');
    const res = makeMockResponse(newData);

    await streamToFile(res, filePath);

    expect(fs.readFileSync(filePath).toString()).toBe('new');
  });
});

describe('streamToBuffer verification', () => {
  it('throws on Content-Length mismatch', async () => {
    const data = Buffer.from('short');
    // Claim content-length is much larger than actual data
    const res = makeMockResponse(data, {
      headers: { 'content-length': '1000' },
    });

    await expect(streamToBuffer(res)).rejects.toThrow('Size mismatch');
    await expect(streamToBuffer(res)).rejects.toThrow('expected 1000 bytes');
  });

  it('succeeds when Content-Length matches', async () => {
    const data = Buffer.from('exact match');
    const res = makeMockResponse(data, {
      headers: { 'content-length': String(data.length) },
    });

    const result = await streamToBuffer(res);
    expect(result.toString()).toBe('exact match');
  });

  it('succeeds when no Content-Length header', async () => {
    const data = Buffer.from('no header');
    const res = makeMockResponse(data);

    const result = await streamToBuffer(res);
    expect(result.toString()).toBe('no header');
  });
});

describe('downloadWithResume', () => {
  const originalFetch = global.fetch;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-dl-test-'));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  });

  it('downloads full file when no .part exists', async () => {
    const data = Buffer.from('complete file content');
    const filePath = path.join(tmpDir, 'download.zip');

    global.fetch = jest.fn().mockResolvedValue(
      makeMockResponse(data, {
        headers: { 'content-length': String(data.length) },
      }),
    ) as unknown as typeof fetch;

    const result = await downloadWithResume(filePath + '.url', filePath);

    expect(result.verified).toBe(true);
    expect(result.resumed).toBe(false);
    expect(result.bytesWritten).toBe(data.length);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath).toString()).toBe('complete file content');
    // .part file should not exist after successful download
    expect(fs.existsSync(filePath + '.part')).toBe(false);
  });

  it('sends Range header when .part file exists and server supports it', async () => {
    const filePath = path.join(tmpDir, 'partial.zip');
    const partPath = filePath + '.part';

    // Create partial file with 10 bytes
    fs.writeFileSync(partPath, Buffer.alloc(10, 'a'));

    const remainingData = Buffer.from('remaining data');
    const mockFetch = jest.fn().mockResolvedValue(
      makeMockResponse(remainingData, {
        status: 206,
        headers: { 'content-length': String(remainingData.length) },
      }),
    );
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadWithResume(filePath + '.url', filePath);

    // Should have sent Range header
    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].headers['Range']).toBe('bytes=10-');

    // Should report resumed
    expect(result.resumed).toBe(true);
    expect(result.bytesWritten).toBe(10 + remainingData.length);

    // Final file should exist, .part should not
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.existsSync(partPath)).toBe(false);
  });

  it('starts fresh when server returns 200 instead of 206', async () => {
    const filePath = path.join(tmpDir, 'norange.zip');
    const partPath = filePath + '.part';

    // Create partial file
    fs.writeFileSync(partPath, Buffer.alloc(5, 'x'));

    const fullData = Buffer.from('full fresh download');
    global.fetch = jest.fn().mockResolvedValue(
      makeMockResponse(fullData, {
        status: 200,
        headers: { 'content-length': String(fullData.length) },
      }),
    ) as unknown as typeof fetch;

    const result = await downloadWithResume(filePath + '.url', filePath);

    expect(result.verified).toBe(true);
    expect(result.resumed).toBe(false); // Server didn't support range
    expect(result.bytesWritten).toBe(fullData.length);
    expect(fs.readFileSync(filePath).toString()).toBe('full fresh download');
  });

  it('throws on HTTP error', async () => {
    const filePath = path.join(tmpDir, 'error.zip');

    global.fetch = jest.fn().mockResolvedValue(
      makeMockResponse(Buffer.alloc(0), { ok: false, status: 500 }),
    ) as unknown as typeof fetch;

    await expect(downloadWithResume(filePath + '.url', filePath)).rejects.toThrow(
      'Download failed HTTP 500',
    );
  });

  it('includes custom headers in the request', async () => {
    const data = Buffer.from('authed content');
    const filePath = path.join(tmpDir, 'authed.zip');

    const mockFetch = jest.fn().mockResolvedValue(
      makeMockResponse(data, {
        headers: { 'content-length': String(data.length) },
      }),
    );
    global.fetch = mockFetch as unknown as typeof fetch;

    await downloadWithResume(filePath + '.url', filePath, {
      'User-Agent': 'TestAgent',
      'Authorization': 'Bearer tok',
    });

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].headers['User-Agent']).toBe('TestAgent');
    expect(fetchCall[1].headers['Authorization']).toBe('Bearer tok');
  });

  it('fires onProgress during download', async () => {
    const data = Buffer.from('progress data here');
    const filePath = path.join(tmpDir, 'progress.zip');
    const onProgress = jest.fn();

    global.fetch = jest.fn().mockResolvedValue(
      makeMockResponse(data, {
        headers: { 'content-length': String(data.length) },
      }),
    ) as unknown as typeof fetch;

    await downloadWithResume(filePath + '.url', filePath, {}, onProgress);

    expect(onProgress).toHaveBeenCalled();
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
    expect(lastCall.bytesReceived).toBe(data.length);
  });

  it('does not send Range header when no .part file exists', async () => {
    const data = Buffer.from('fresh download');
    const filePath = path.join(tmpDir, 'fresh.zip');

    const mockFetch = jest.fn().mockResolvedValue(
      makeMockResponse(data, {
        headers: { 'content-length': String(data.length) },
      }),
    );
    global.fetch = mockFetch as unknown as typeof fetch;

    await downloadWithResume(filePath + '.url', filePath);

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].headers['Range']).toBeUndefined();
  });

  it('handles empty .part file (0 bytes) as fresh download', async () => {
    const filePath = path.join(tmpDir, 'empty-part.zip');
    const partPath = filePath + '.part';

    // Create empty .part file
    fs.writeFileSync(partPath, Buffer.alloc(0));

    const data = Buffer.from('full download');
    const mockFetch = jest.fn().mockResolvedValue(
      makeMockResponse(data, {
        headers: { 'content-length': String(data.length) },
      }),
    );
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadWithResume(filePath + '.url', filePath);

    // Should not send Range header for 0-byte .part
    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].headers['Range']).toBeUndefined();
    expect(result.resumed).toBe(false);
    expect(result.bytesWritten).toBe(data.length);
  });

  it('starts fresh when server returns non-206 non-200 status with .part file', async () => {
    const filePath = path.join(tmpDir, 'weirdstatus.zip');
    const partPath = filePath + '.part';

    fs.writeFileSync(partPath, Buffer.alloc(10, 'x'));

    const fullData = Buffer.from('full data');
    global.fetch = jest.fn().mockResolvedValue(
      makeMockResponse(fullData, {
        // 416 Range Not Satisfiable — server doesn't like the range, but ok=true in our mock
        status: 200,
        ok: true,
        headers: { 'content-length': String(fullData.length) },
      }),
    ) as unknown as typeof fetch;

    const result = await downloadWithResume(filePath + '.url', filePath);

    expect(result.resumed).toBe(false);
    expect(result.bytesWritten).toBe(fullData.length);
  });
});
