import fs from 'fs';
import os from 'os';
import path from 'path';
import { downloadGameDirect } from '../downloadGameDirect';
import * as httpDownload from '../httpDownload';

jest.mock('../httpDownload', () => ({
  streamToFile: jest.fn().mockResolvedValue(undefined),
  streamToBuffer: jest.fn().mockResolvedValue(Buffer.from('test-content')),
}));

jest.mock('../fetchItchGameProfile', () => ({
  fetchItchGameProfile: jest.fn().mockResolvedValue({
    found: true,
    itchRecord: { name: 'testgame', author: 'testauthor', title: 'Test Game' },
    message: 'ok',
  }),
}));

const mockResponse = (
  body: string | Buffer,
  opts: {
    ok?: boolean;
    status?: number;
    headers?: Record<string, string>;
    setCookies?: string[];
  } = {},
) => ({
  ok: opts.ok ?? true,
  status: opts.status ?? 200,
  text: async () => (typeof body === 'string' ? body : body.toString()),
  json: async () => JSON.parse(typeof body === 'string' ? body : body.toString()),
  headers: {
    get: (name: string) => opts.headers?.[name.toLowerCase()] ?? null,
    getSetCookie: () => opts.setCookies ?? [],
  },
  body: null,
});

describe('downloadGameDirect', () => {
  const originalFetch = global.fetch;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dgd-test-'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  it('direct download happy path', async () => {
    const gamePageHtml = `
      <html>
        <input name="csrf_token" value="tok123" />
        <div data-upload_id="42">file.zip</div>
      </html>
    `;
    const downloadPageHtml = `
      <html>
        <input name="csrf_token" value="tok456" />
        <div data-upload_id="42">file.zip</div>
      </html>
    `;

    const mockFetch = jest.fn();
    // Step 1: GET game page
    mockFetch.mockResolvedValueOnce(
      mockResponse(gamePageHtml, { setCookies: ['session=abc123; Path=/'] }),
    );
    // Step 2: POST download_url
    mockFetch.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ url: 'https://itch.io/download/page/1' })),
    );
    // Step 3: GET download page
    mockFetch.mockResolvedValueOnce(
      mockResponse(downloadPageHtml, { setCookies: ['dl_sess=xyz; Path=/'] }),
    );
    // Step 4: POST /file/{uploadId}
    mockFetch.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ url: 'https://cdn.example.com/game.zip' })),
    );
    // Step 5: GET CDN URL
    mockFetch.mockResolvedValueOnce(
      mockResponse('', {
        headers: { 'content-disposition': 'attachment; filename="game.zip"' },
      }),
    );

    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameDirect({
      itchGameUrl: 'https://testauthor.itch.io/testgame',
      downloadDirectory: tmpDir,
      writeMetaData: false,
    });

    expect(result.status).toBe(true);
    expect(result.message).toContain('Download successful');
    expect(httpDownload.streamToFile).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(5);
  });

  it('donation wall happy path', async () => {
    // Game page: no upload_id, but min_price:0 and /purchase link
    const gamePageHtml = `
      <html>
        <input name="csrf_token" value="tok789" />
        <script>"min_price":0</script>
        <a href="/purchase">Download</a>
      </html>
    `;
    // Download page: now shows upload IDs
    const downloadPageHtml = `
      <html>
        <input name="csrf_token" value="tokDL" />
        <div data-upload_id="99">game.zip</div>
      </html>
    `;

    const mockFetch = jest.fn();
    // Step 1: GET game page
    mockFetch.mockResolvedValueOnce(mockResponse(gamePageHtml));
    // Step 2: POST download_url (no upload_id in body)
    mockFetch.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ url: 'https://itch.io/download/page/2' })),
    );
    // Step 3: GET download page
    mockFetch.mockResolvedValueOnce(mockResponse(downloadPageHtml));
    // Step 4: POST /file/{uploadId}
    mockFetch.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ url: 'https://cdn.example.com/game2.zip' })),
    );
    // Step 5: GET CDN URL
    mockFetch.mockResolvedValueOnce(
      mockResponse('', {
        headers: { 'content-disposition': 'attachment; filename="game2.zip"' },
      }),
    );

    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameDirect({
      itchGameUrl: 'https://testauthor.itch.io/donationgame',
      downloadDirectory: tmpDir,
      writeMetaData: false,
    });

    expect(result.status).toBe(true);
    expect(result.message).toContain('Download successful');

    // Verify the POST body did NOT contain upload_id (donation wall path)
    const postCall = mockFetch.mock.calls[1];
    expect(postCall[1].body).not.toContain('upload_id');
  });

  it('paid game rejection', async () => {
    const gamePageHtml = `
      <html>
        <input name="csrf_token" value="tok_paid" />
        <script>"min_price":500</script>
      </html>
    `;

    const mockFetch = jest.fn();
    mockFetch.mockResolvedValueOnce(mockResponse(gamePageHtml));
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameDirect({
      itchGameUrl: 'https://author.itch.io/paidgame',
      downloadDirectory: tmpDir,
    });

    expect(result.status).toBe(false);
    expect(result.message).toContain('purchase');
  });

  it('CSRF extraction failure', async () => {
    const gamePageHtml = `
      <html>
        <div data-upload_id="42">file.zip</div>
      </html>
    `;

    const mockFetch = jest.fn();
    mockFetch.mockResolvedValueOnce(mockResponse(gamePageHtml));
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameDirect({
      itchGameUrl: 'https://author.itch.io/nocsrf',
      downloadDirectory: tmpDir,
    });

    expect(result.status).toBe(false);
    expect(result.message).toContain('CSRF');
  });

  it('CDN URL failure returns httpStatus', async () => {
    const gamePageHtml = `
      <html>
        <input name="csrf_token" value="tok_cdn" />
        <div data-upload_id="42">file.zip</div>
      </html>
    `;
    const downloadPageHtml = `
      <html>
        <input name="csrf_token" value="tok_cdn2" />
        <div data-upload_id="42">file.zip</div>
      </html>
    `;

    const mockFetch = jest.fn();
    mockFetch.mockResolvedValueOnce(mockResponse(gamePageHtml));
    mockFetch.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ url: 'https://itch.io/download/page/3' })),
    );
    mockFetch.mockResolvedValueOnce(mockResponse(downloadPageHtml));
    mockFetch.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ url: 'https://cdn.example.com/file.zip' })),
    );
    // CDN returns 403
    mockFetch.mockResolvedValueOnce(
      mockResponse('Forbidden', { ok: false, status: 403 }),
    );

    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameDirect({
      itchGameUrl: 'https://author.itch.io/cdnfail',
      downloadDirectory: tmpDir,
      writeMetaData: false,
    });

    expect(result.status).toBe(false);
    expect(result.httpStatus).toBe(403);
    expect(result.message).toContain('CDN');
  });

  it('web-only HTML5 rejection', async () => {
    const gamePageHtml = `
      <html>
        <input name="csrf_token" value="tok_html5" />
        <div class="game_frame">
          <iframe src="https://itch.zone/html/12345/index.html"></iframe>
        </div>
      </html>
    `;

    const mockFetch = jest.fn();
    mockFetch.mockResolvedValueOnce(mockResponse(gamePageHtml));
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameDirect({
      itchGameUrl: 'https://author.itch.io/webonly',
      downloadDirectory: tmpDir,
    });

    expect(result.status).toBe(false);
    expect(result.message).toContain('web-only');
  });

  it('path traversal rejection', async () => {
    const result = await downloadGameDirect({
      itchGameUrl: 'https://author.itch.io/game',
      desiredFileName: '../../bad',
      downloadDirectory: tmpDir,
    });

    expect(result.status).toBe(false);
    expect(result.message).toContain('path separators');
  });

  it('inMemory mode returns fileBuffer, no file on disk', async () => {
    const gamePageHtml = `
      <html>
        <input name="csrf_token" value="tokmem" />
        <div data-upload_id="77">file.zip</div>
      </html>
    `;
    const downloadPageHtml = `
      <html>
        <input name="csrf_token" value="tokmem2" />
        <div data-upload_id="77">file.zip</div>
      </html>
    `;

    const mockFetch = jest.fn();
    mockFetch.mockResolvedValueOnce(mockResponse(gamePageHtml));
    mockFetch.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ url: 'https://itch.io/download/page/mem' })),
    );
    mockFetch.mockResolvedValueOnce(mockResponse(downloadPageHtml));
    mockFetch.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ url: 'https://cdn.example.com/mem.zip' })),
    );
    mockFetch.mockResolvedValueOnce(
      mockResponse('', {
        headers: { 'content-disposition': 'attachment; filename="mem.zip"' },
      }),
    );

    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameDirect({
      itchGameUrl: 'https://author.itch.io/memgame',
      inMemory: true,
      writeMetaData: false,
    });

    expect(result.status).toBe(true);
    expect(result.fileBuffer).toBeInstanceOf(Buffer);
    expect(result.filePath).toBeUndefined();
    expect(httpDownload.streamToBuffer).toHaveBeenCalled();
    expect(httpDownload.streamToFile).not.toHaveBeenCalled();
  });

  it('returns error for missing URL and no name/author', async () => {
    const result = await downloadGameDirect({});
    expect(result.status).toBe(false);
    expect(result.message).toContain('Invalid input');
  });

  it('constructs URL from name and author when itchGameUrl is not provided', async () => {
    const gamePageHtml = `
      <html>
        <input name="csrf_token" value="tokna" />
        <div data-upload_id="55">file.zip</div>
      </html>
    `;
    const downloadPageHtml = `
      <html>
        <input name="csrf_token" value="tokna2" />
        <div data-upload_id="55">file.zip</div>
      </html>
    `;

    const mockFetch = jest.fn();
    mockFetch.mockResolvedValueOnce(mockResponse(gamePageHtml));
    mockFetch.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ url: 'https://itch.io/download/page/na' })),
    );
    mockFetch.mockResolvedValueOnce(mockResponse(downloadPageHtml));
    mockFetch.mockResolvedValueOnce(
      mockResponse(JSON.stringify({ url: 'https://cdn.example.com/na.zip' })),
    );
    mockFetch.mockResolvedValueOnce(
      mockResponse('', {
        headers: { 'content-disposition': 'attachment; filename="na.zip"' },
      }),
    );

    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameDirect({
      name: 'My Game',
      author: 'testdev',
      downloadDirectory: tmpDir,
      writeMetaData: false,
    });

    expect(result.status).toBe(true);
    // Verify the constructed URL used the correct format
    const firstCall = mockFetch.mock.calls[0];
    expect(firstCall[0]).toBe('https://testdev.itch.io/my-game');
  });
});
