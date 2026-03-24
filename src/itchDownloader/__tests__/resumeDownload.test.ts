import fs from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { downloadWithResume, streamToFile } from '../httpDownload';

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

describe('streamToFile with verification', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-test-'));
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
    expect(result.bytesWritten).toBe(data.length);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath).toString()).toBe('complete file content');
    // .part file should not exist
    expect(fs.existsSync(filePath + '.part')).toBe(false);
  });

  it('sends Range header when .part file exists', async () => {
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
    expect(result.bytesWritten).toBe(10 + remainingData.length);
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
});
