import fs from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { ItchApiClient } from '../itchApiClient';

describe('ItchApiClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends Authorization Bearer header', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });
    global.fetch = mockFetch;

    const client = new ItchApiClient('my-secret-key');
    await client.get('/games/1/uploads');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(options.headers).toEqual({ Authorization: 'Bearer my-secret-key' });
    // API key must NOT appear in the URL query string
    expect(url).not.toContain('api_key');
    expect(url).not.toContain('my-secret-key');
  });

  it('throws on non-ok response', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    });
    global.fetch = mockFetch;

    const client = new ItchApiClient('key');

    try {
      await client.get('/games/999/uploads');
      fail('Expected error to be thrown');
    } catch (err: any) {
      expect(err.message).toContain('404');
      expect(err.statusCode).toBe(404);
    }
  });

  it('get() parses JSON response', async () => {
    const payload = { uploads: [{ id: 1, filename: 'game.zip' }] };
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    global.fetch = mockFetch;

    const client = new ItchApiClient('key');
    const result = await client.get<{ uploads: { id: number; filename: string }[] }>(
      '/games/42/uploads',
    );

    expect(result).toEqual(payload);
    expect(result.uploads[0].filename).toBe('game.zip');
  });

  it('download() writes file to disk and returns StreamResult', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-dl-'));
    const filePath = path.join(tmpDir, 'downloaded.zip');
    const data = Buffer.from('file-content-here');

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: (h: string) => (h === 'content-length' ? String(data.length) : null) },
      body: Readable.from(data),
    });
    global.fetch = mockFetch;

    const client = new ItchApiClient('key');
    const result = await client.download('/uploads/1/download', filePath);

    expect(fs.existsSync(filePath)).toBe(true);
    const written = fs.readFileSync(filePath);
    expect(written.toString()).toBe('file-content-here');

    // StreamResult fields
    expect(result).toHaveProperty('bytesWritten', data.length);
    expect(result).toHaveProperty('verified', true);
    expect(result).toHaveProperty('expectedBytes', data.length);
  });

  it('download() throws on non-ok response', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-dl-err-'));
    const filePath = path.join(tmpDir, 'fail.zip');

    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    });
    global.fetch = mockFetch;

    const client = new ItchApiClient('key');

    try {
      await client.download('/uploads/1/download', filePath);
      fail('Expected error to be thrown');
    } catch (err: any) {
      expect(err.message).toContain('403');
      expect(err.statusCode).toBe(403);
    }
  });

  it('downloadWithResume() delegates to downloadWithResume and includes auth headers', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-resume-'));
    const filePath = path.join(tmpDir, 'resumed.zip');
    const data = Buffer.from('resumed-content');

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (h: string) => (h === 'content-length' ? String(data.length) : null) },
      body: Readable.from(data),
    });
    global.fetch = mockFetch;

    const client = new ItchApiClient('resume-key');
    const result = await client.downloadWithResume('/uploads/1/download', filePath);

    expect(result).toHaveProperty('bytesWritten', data.length);
    expect(result).toHaveProperty('verified', true);
    expect(result).toHaveProperty('resumed', false);

    // Verify auth headers were passed
    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].headers['Authorization']).toBe('Bearer resume-key');

    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath).toString()).toBe('resumed-content');
  });

  it('downloadToBuffer() returns Buffer with correct content', async () => {
    const data = Buffer.from('buffer-via-api');
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      body: Readable.from(data),
    });
    global.fetch = mockFetch;

    const client = new ItchApiClient('key');
    const result = await client.downloadToBuffer('/uploads/1/download');

    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toBe('buffer-via-api');
  });
});
