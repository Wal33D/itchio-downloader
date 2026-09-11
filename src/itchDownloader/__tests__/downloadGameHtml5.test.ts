import fs from 'fs';
import os from 'os';
import path from 'path';
import { downloadGameHtml5 } from '../downloadGameHtml5';

jest.mock('../fetchItchGameProfile', () => ({
  fetchItchGameProfile: jest.fn().mockResolvedValue({
    found: true,
    itchRecord: {
      name: 'html5game',
      author: 'testauthor',
      title: 'HTML5 Game',
    },
    message: 'ok',
  }),
}));

const mockResponse = (
  body: string | Buffer,
  opts: {
    ok?: boolean;
    status?: number;
    headers?: Record<string, string>;
  } = {},
) => {
  const buffer = typeof body === 'string' ? Buffer.from(body) : body;
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    text: async () => buffer.toString(),
    json: async () => JSON.parse(buffer.toString()),
    arrayBuffer: async () =>
      buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ),
    headers: {
      get: (name: string) => opts.headers?.[name.toLowerCase()] ?? null,
    },
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(buffer);
        controller.close();
      },
    }),
  };
};

describe('downloadGameHtml5', () => {
  const originalFetch = global.fetch;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dgh5-test-'));
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

  it('happy path: downloads index + all assets', async () => {
    const gamePageHtml = `
      <html>
        <iframe src="https://html-classic.itch.zone/html/12345/index.html"></iframe>
      </html>
    `;
    const indexHtml = `
      <html>
        <script src="game.js"></script>
        <link href="style.css" rel="stylesheet" />
      </html>
    `;
    const gameJs = `
      var bg = "sprites/bg.png";
      console.log("loading");
    `;

    const mockFetch = jest.fn();
    // Step 1: GET game page
    mockFetch.mockResolvedValueOnce(mockResponse(gamePageHtml));
    // Step 2: GET index.html
    mockFetch.mockResolvedValueOnce(mockResponse(indexHtml));
    // Step 3+: GET JS file (for scanning)
    mockFetch.mockResolvedValueOnce(mockResponse(gameJs));
    // Step 4: GET each asset: game.js, style.css, sprites/bg.png
    mockFetch.mockResolvedValueOnce(mockResponse('// game js content'));
    mockFetch.mockResolvedValueOnce(mockResponse('body { color: red; }'));
    mockFetch.mockResolvedValueOnce(mockResponse(Buffer.from('PNG_DATA')));

    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameHtml5({
      itchGameUrl: 'https://testauthor.itch.io/html5game',
      downloadDirectory: tmpDir,
      writeMetaData: false,
    });

    expect(result.status).toBe(true);
    expect(result.html5Assets).toBeDefined();
    expect(result.html5Assets).toContain('game.js');
    expect(result.html5Assets).toContain('style.css');
    expect(result.html5Assets).toContain('sprites/bg.png');
    expect(result.html5Assets).toContain('index.html');
    expect(result.message).toContain('HTML5 game downloaded');
  });

  it('not HTML5 game: no itch.zone/html/ pattern', async () => {
    const gamePageHtml = `
      <html>
        <div>Regular game page, no iframe embed</div>
      </html>
    `;

    const mockFetch = jest.fn();
    mockFetch.mockResolvedValueOnce(mockResponse(gamePageHtml));
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameHtml5({
      itchGameUrl: 'https://testauthor.itch.io/nothtml5',
      downloadDirectory: tmpDir,
    });

    expect(result.status).toBe(false);
    expect(result.message).toContain('Not an HTML5');
  });

  it('extracts an HTML-escaped iframe URL and preserves its query string', async () => {
    const gamePageHtml = `
      <div data-iframe="&lt;iframe src=&quot;https://html-classic.itch.zone/html/54321/index.html?v=42&amp;source=test&quot;&gt;&lt;/iframe&gt;"></div>
    `;
    const indexHtml = '<html><body>single-file game</body></html>';
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(mockResponse(gamePageHtml))
      .mockResolvedValueOnce(mockResponse(indexHtml));
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameHtml5({
      itchGameUrl: 'https://author.itch.io/escaped-game',
      downloadDirectory: tmpDir,
      writeMetaData: false,
    });

    expect(result.status).toBe(true);
    expect(mockFetch.mock.calls[1][0]).toBe(
      'https://html-classic.itch.zone/html/54321/index.html?v=42&source=test',
    );
    expect(result.bytesDownloaded).toBe(Buffer.byteLength(indexHtml));
  });

  it('reuses a pre-fetched game page during auto-detection', async () => {
    const gamePageHtml = `
      <iframe src="https://html-classic.itch.zone/html/54322/index.html?v=43"></iframe>
    `;
    const indexHtml = '<html><body>auto-detected game</body></html>';
    const mockFetch = jest.fn().mockResolvedValueOnce(mockResponse(indexHtml));
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameHtml5(
      {
        itchGameUrl: 'https://author.itch.io/auto-detected-game',
        downloadDirectory: tmpDir,
        writeMetaData: false,
      },
      { pageHtml: gamePageHtml },
    );

    expect(result.status).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://html-classic.itch.zone/html/54322/index.html?v=43',
      expect.any(Object),
    );
  });

  it('does not treat src strings inside inline JavaScript as HTML assets', async () => {
    const gamePageHtml = `
      <iframe src="https://html-classic.itch.zone/html/77777/index.html"></iframe>
    `;
    const indexHtml = `
      <html><body>
        <script>const template = 'src="'.concat(dynamicValue, '"';</script>
      </body></html>
    `;
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(mockResponse(gamePageHtml))
      .mockResolvedValueOnce(mockResponse(indexHtml));
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameHtml5({
      itchGameUrl: 'https://author.itch.io/single-file-game',
      downloadDirectory: tmpDir,
      writeMetaData: false,
    });

    expect(result.status).toBe(true);
    expect(result.sizeVerified).toBe(true);
    expect(result.html5Assets).toEqual(['index.html']);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('streams index.html to disk without buffering it through response.text()', async () => {
    const gamePageHtml = `
      <iframe src="https://html-classic.itch.zone/html/88888/index.html"></iframe>
    `;
    const indexHtml = `
      <html><body>
        <script>${'const embedded = "src=not-an-asset";'.repeat(10_000)}</script>
        <img src="images/cover.png">
      </body></html>
    `;
    const indexResponse = mockResponse(indexHtml);
    indexResponse.text = jest.fn(async () => {
      throw new Error('index response should be streamed');
    });
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(mockResponse(gamePageHtml))
      .mockResolvedValueOnce(indexResponse)
      .mockResolvedValueOnce(mockResponse(Buffer.from('PNG')));
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameHtml5({
      itchGameUrl: 'https://author.itch.io/streamed-game',
      downloadDirectory: tmpDir,
      writeMetaData: false,
    });

    expect(result.status).toBe(true);
    expect(indexResponse.text).not.toHaveBeenCalled();
    expect(result.html5Assets).toEqual(['index.html', 'images/cover.png']);
    expect(result.bytesDownloaded).toBe(
      Buffer.byteLength(indexHtml) + Buffer.byteLength('PNG'),
    );
  });

  it('bounds parser memory for oversized embedded-data attributes', async () => {
    const gamePageHtml = `
      <iframe src="https://html-classic.itch.zone/html/99998/index.html"></iframe>
    `;
    const indexHtml = `
      <html><body>
        <script data="${'embedded-data'.repeat(20_000)}"></script>
        <img src="images/after-embedded-data.png">
      </body></html>
    `;
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(mockResponse(gamePageHtml))
      .mockResolvedValueOnce(mockResponse(indexHtml))
      .mockResolvedValueOnce(mockResponse(Buffer.from('PNG')));
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameHtml5({
      itchGameUrl: 'https://author.itch.io/embedded-data-game',
      downloadDirectory: tmpDir,
      writeMetaData: false,
    });

    expect(result.status).toBe(true);
    expect(result.html5Assets).toEqual([
      'index.html',
      'images/after-embedded-data.png',
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('explains when a game page is private or restricted', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        mockResponse('Forbidden', { ok: false, status: 403 }),
      ) as unknown as typeof fetch;

    const result = await downloadGameHtml5({
      itchGameUrl: 'https://author.itch.io/private-game',
      downloadDirectory: tmpDir,
    });

    expect(result.status).toBe(false);
    expect(result.httpStatus).toBe(403);
    expect(result.failReason).toBe('page_unavailable');
    expect(result.message).toContain('private, restricted');
  });

  it('asset download failure tolerance: overall success with failed assets noted', async () => {
    const gamePageHtml = `
      <html>
        <iframe src="https://html-classic.itch.zone/html/99999/index.html"></iframe>
      </html>
    `;
    const indexHtml = `
      <html>
        <script src="app.js"></script>
        <link href="missing.css" rel="stylesheet" />
      </html>
    `;

    const mockFetch = jest.fn();
    // Step 1: GET game page
    mockFetch.mockResolvedValueOnce(mockResponse(gamePageHtml));
    // Step 2: GET index.html
    mockFetch.mockResolvedValueOnce(mockResponse(indexHtml));
    // Step 3: GET JS file for scanning (app.js)
    mockFetch.mockResolvedValueOnce(mockResponse('var x = 1;'));
    // Step 4: Download app.js - success
    mockFetch.mockResolvedValueOnce(mockResponse('var x = 1;'));
    // Step 5: Download missing.css - 404
    mockFetch.mockResolvedValueOnce(
      mockResponse('Not Found', { ok: false, status: 404 }),
    );

    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameHtml5({
      itchGameUrl: 'https://testauthor.itch.io/partialfail',
      downloadDirectory: tmpDir,
      writeMetaData: false,
    });

    expect(result.status).toBe(true);
    expect(result.message).toContain('failed');
    expect(result.html5Assets).toContain('app.js');
    expect(result.html5Assets).toContain('index.html');
  });

  it('directory structure preserved for nested assets', async () => {
    const gamePageHtml = `
      <html>
        <iframe src="https://html-classic.itch.zone/html/11111/index.html"></iframe>
      </html>
    `;
    const indexHtml = `
      <html>
        <script src="js/main.js"></script>
      </html>
    `;

    const mockFetch = jest.fn();
    mockFetch.mockResolvedValueOnce(mockResponse(gamePageHtml));
    mockFetch.mockResolvedValueOnce(mockResponse(indexHtml));
    // Scan JS - discovers nested asset
    mockFetch.mockResolvedValueOnce(mockResponse('"sprites/bg.png"'));
    // Download js/main.js
    mockFetch.mockResolvedValueOnce(mockResponse('"sprites/bg.png"'));
    // Download sprites/bg.png
    mockFetch.mockResolvedValueOnce(mockResponse(Buffer.from('PNG')));

    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameHtml5({
      itchGameUrl: 'https://testauthor.itch.io/nestedgame',
      downloadDirectory: tmpDir,
      writeMetaData: false,
    });

    expect(result.status).toBe(true);

    // Check that subdirectories were created
    const gameDir = path.join(tmpDir, 'nestedgame');
    expect(fs.existsSync(path.join(gameDir, 'index.html'))).toBe(true);
  });

  it('JS asset scanning finds sound and data files', async () => {
    const gamePageHtml = `
      <html>
        <iframe src="https://html-classic.itch.zone/html/22222/index.html"></iframe>
      </html>
    `;
    const indexHtml = `
      <html>
        <script src="engine.js"></script>
      </html>
    `;
    const engineJs = `
      var click = "sounds/click.mp3";
      var levels = "data/levels.json";
      console.log("loaded");
    `;

    const mockFetch = jest.fn();
    mockFetch.mockResolvedValueOnce(mockResponse(gamePageHtml));
    mockFetch.mockResolvedValueOnce(mockResponse(indexHtml));
    // Scan JS
    mockFetch.mockResolvedValueOnce(mockResponse(engineJs));
    // Download engine.js
    mockFetch.mockResolvedValueOnce(mockResponse(engineJs));
    // Download sounds/click.mp3
    mockFetch.mockResolvedValueOnce(mockResponse(Buffer.from('MP3_DATA')));
    // Download data/levels.json
    mockFetch.mockResolvedValueOnce(mockResponse('{"levels":[]}'));

    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameHtml5({
      itchGameUrl: 'https://testauthor.itch.io/soundgame',
      downloadDirectory: tmpDir,
      writeMetaData: false,
    });

    expect(result.status).toBe(true);
    expect(result.html5Assets).toContain('sounds/click.mp3');
    expect(result.html5Assets).toContain('data/levels.json');
  });

  it('returns error for missing URL and no name/author', async () => {
    const result = await downloadGameHtml5({});
    expect(result.status).toBe(false);
    expect(result.message).toContain('Invalid input');
  });

  it('constructs URL from name and author when itchGameUrl is not provided', async () => {
    const gamePageHtml = `
      <html>
        <iframe src="https://html-classic.itch.zone/html/33333/index.html"></iframe>
      </html>
    `;
    const indexHtml = '<html></html>';

    const mockFetch = jest.fn();
    mockFetch.mockResolvedValueOnce(mockResponse(gamePageHtml));
    mockFetch.mockResolvedValueOnce(mockResponse(indexHtml));
    global.fetch = mockFetch as unknown as typeof fetch;

    const result = await downloadGameHtml5({
      name: 'My HTML5 Game',
      author: 'devuser',
      downloadDirectory: tmpDir,
      writeMetaData: false,
    });

    expect(result.status).toBe(true);
    const firstCall = mockFetch.mock.calls[0];
    expect(firstCall[0]).toBe('https://devuser.itch.io/my-html5-game');
  });
});
