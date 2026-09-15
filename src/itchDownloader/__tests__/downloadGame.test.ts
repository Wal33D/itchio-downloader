import fs from 'fs';
import os from 'os';
import path from 'path';
import * as downloadGameModule from '../downloadGame';
const { downloadGame } = downloadGameModule;
import * as fetchProfile from '../fetchItchGameProfile';
import * as initBrowser from '../initializeBrowser';
import * as initiateDownload from '../initiateDownload';
import * as waitFile from '../../fileUtils/waitForFile';
import * as renameFileModule from '../../fileUtils/renameFile';
import * as createFileModule from '../../fileUtils/createFile';
import * as downloadGameDirectModule from '../downloadGameDirect';
import * as puppeteerRuntime from '../puppeteerRuntime';
import { Readable } from 'stream';

jest.mock('puppeteer', () => ({ __esModule: true, default: {} }), {
  virtual: true,
});

describe('downloadGame', () => {
  beforeEach(() => {
    delete process.env.ITCH_API_KEY;
    // Tests in this file exercise routing and the Puppeteer fallback. Keep them
    // isolated from the network and mock the earlier direct-HTTP stage by default.
    jest
      .spyOn(downloadGameDirectModule, 'downloadGameDirect')
      .mockResolvedValue({
        status: false,
        message: 'Mock direct HTTP failure.',
        failReason: 'csrf_failed',
      });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.DEBUG_DOWNLOAD_GAME;
    delete process.env.ITCH_API_KEY;
  });

  it('processes a download using mocks with debug logs', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-test-'));
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    process.env.DEBUG_DOWNLOAD_GAME = 'true';
    const itchRecord = {
      name: 'game',
      author: 'user',
      title: 'Game',
      itchMetaDataUrl: '',
      domain: 'itch.io',
    };

    jest
      .spyOn(fetchProfile, 'fetchItchGameProfile')
      .mockResolvedValue({ found: true, itchRecord, message: 'ok' });
    const closeMock = jest.fn();
    jest.spyOn(initBrowser, 'initializeBrowser').mockResolvedValue({
      browser: { close: closeMock } as any,
      status: true,
      message: 'ok',
    });
    jest
      .spyOn(initiateDownload, 'initiateDownload')
      .mockResolvedValue({ status: true, message: 'ok' });
    jest.spyOn(waitFile, 'waitForFile').mockResolvedValue({
      status: true,
      message: 'done',
      filePath: path.join(tmpDir, 'game.zip'),
    });
    jest.spyOn(renameFileModule, 'renameFile').mockResolvedValue({
      status: true,
      message: 'renamed',
      newFilePath: path.join(tmpDir, 'renamed.zip'),
    });
    const createSpy = jest
      .spyOn(createFileModule, 'createFile')
      .mockResolvedValue({} as any);

    const result = (await downloadGame({
      name: 'game',
      author: 'user',
      desiredFileName: 'renamed',
      downloadDirectory: tmpDir,
    })) as any;

    expect(result.status).toBe(true);
    expect(result.filePath).toBe(path.join(tmpDir, 'renamed.zip'));
    expect(result.metadataPath).toBe(path.join(tmpDir, 'game-metadata.json'));
    expect(result.metaData).toEqual(itchRecord);
    expect(createSpy).toHaveBeenCalledWith({
      filePath: path.join(tmpDir, 'game-metadata.json'),
      content: JSON.stringify(itchRecord, null, 2),
    });
    expect(closeMock).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });

  it('does not log when debug flag is disabled', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-test-'));
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const itchRecord = {
      name: 'game',
      author: 'user',
      title: 'Game',
      itchMetaDataUrl: '',
      domain: 'itch.io',
    };

    jest
      .spyOn(fetchProfile, 'fetchItchGameProfile')
      .mockResolvedValue({ found: true, itchRecord, message: 'ok' });
    const closeMock = jest.fn();
    jest.spyOn(initBrowser, 'initializeBrowser').mockResolvedValue({
      browser: { close: closeMock } as any,
      status: true,
      message: 'ok',
    });
    jest
      .spyOn(initiateDownload, 'initiateDownload')
      .mockResolvedValue({ status: true, message: 'ok' });
    jest.spyOn(waitFile, 'waitForFile').mockResolvedValue({
      status: true,
      message: 'done',
      filePath: path.join(tmpDir, 'game.zip'),
    });
    jest.spyOn(renameFileModule, 'renameFile').mockResolvedValue({
      status: true,
      message: 'renamed',
      newFilePath: path.join(tmpDir, 'renamed.zip'),
    });
    jest.spyOn(createFileModule, 'createFile').mockResolvedValue({} as any);

    await downloadGame({
      name: 'game',
      author: 'user',
      desiredFileName: 'renamed',
      downloadDirectory: tmpDir,
    });

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('handles errors from fetchItchGameProfile', async () => {
    jest
      .spyOn(fetchProfile, 'fetchItchGameProfile')
      .mockRejectedValue(new Error('fail'));

    const result = (await downloadGame({
      name: 'game',
      author: 'user',
    })) as any;

    expect(result.status).toBe(false);
    expect(result.message).toContain('fail');
  });

  it('creates the download directory when missing', async () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-dir-'));
    const target = path.join(parent, 'nested');

    const itchRecord = {
      name: 'game',
      author: 'user',
      title: 'Game',
      itchMetaDataUrl: '',
      domain: 'itch.io',
    };
    jest
      .spyOn(fetchProfile, 'fetchItchGameProfile')
      .mockResolvedValue({ found: true, itchRecord, message: 'ok' });
    const closeMock = jest.fn();
    jest.spyOn(initBrowser, 'initializeBrowser').mockResolvedValue({
      browser: { close: closeMock } as any,
      status: true,
      message: 'ok',
    });
    jest
      .spyOn(initiateDownload, 'initiateDownload')
      .mockResolvedValue({ status: true, message: 'ok' });
    jest.spyOn(waitFile, 'waitForFile').mockResolvedValue({
      status: true,
      message: 'done',
      filePath: path.join(target, 'game.zip'),
    });
    jest.spyOn(renameFileModule, 'renameFile').mockResolvedValue({
      status: true,
      message: 'renamed',
      newFilePath: path.join(target, 'renamed.zip'),
    });
    jest.spyOn(createFileModule, 'createFile').mockResolvedValue({} as any);

    expect(fs.existsSync(target)).toBe(false);
    await downloadGame({
      name: 'game',
      author: 'user',
      desiredFileName: 'renamed',
      downloadDirectory: target,
    });
    expect(fs.existsSync(target)).toBe(true);
    expect(closeMock).toHaveBeenCalled();
  });

  it('retries failed downloads with exponential backoff', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-retry-'));
    let attempts = 0;
    jest
      .spyOn(fetchProfile, 'fetchItchGameProfile')
      .mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          const err: any = new Error('fail');
          err.statusCode = 500;
          throw err;
        }
        return { found: true, itchRecord: { name: 'g' }, message: 'ok' } as any;
      });
    jest.spyOn(initBrowser, 'initializeBrowser').mockResolvedValue({
      browser: { close: jest.fn() } as any,
      status: true,
      message: 'ok',
    });
    jest
      .spyOn(initiateDownload, 'initiateDownload')
      .mockResolvedValue({ status: true, message: 'ok' });
    jest.spyOn(waitFile, 'waitForFile').mockResolvedValue({
      status: true,
      message: 'done',
      filePath: path.join(tmpDir, 'game.zip'),
    });
    jest.spyOn(renameFileModule, 'renameFile').mockResolvedValue({
      status: true,
      message: 'renamed',
      newFilePath: path.join(tmpDir, 'game.zip'),
    });
    jest.spyOn(createFileModule, 'createFile').mockResolvedValue({} as any);

    const result = (await downloadGame({
      name: 'game',
      author: 'user',
      downloadDirectory: tmpDir,
      retries: 2,
      retryDelayMs: 10,
    })) as any;

    expect(result.status).toBe(true);
    expect(attempts).toBe(3);
  });

  it('runs downloads concurrently respecting limit', async () => {
    jest
      .spyOn(fetchProfile, 'fetchItchGameProfile')
      .mockResolvedValue({ found: true, itchRecord: {}, message: 'ok' });
    jest.spyOn(initBrowser, 'initializeBrowser').mockResolvedValue({
      browser: { close: jest.fn() } as any,
      status: true,
      message: 'ok',
    });
    jest
      .spyOn(initiateDownload, 'initiateDownload')
      .mockResolvedValue({ status: true, message: 'ok' });
    jest.spyOn(waitFile, 'waitForFile').mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return { status: true, message: 'done', filePath: 'x' } as any;
    });
    jest.spyOn(renameFileModule, 'renameFile').mockResolvedValue({
      status: true,
      message: 'renamed',
      newFilePath: 'x',
    });
    jest.spyOn(createFileModule, 'createFile').mockResolvedValue({} as any);

    const start = Date.now();
    await downloadGame(
      [
        { name: 'a', author: 'u' },
        { name: 'b', author: 'u' },
        { name: 'c', author: 'u' },
      ],
      2,
    );
    const duration = Date.now() - start;
    expect(duration).toBeGreaterThanOrEqual(100);
  });

  it('forwards download progress events', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-prog-'));
    const onProgress = jest.fn();

    jest
      .spyOn(fetchProfile, 'fetchItchGameProfile')
      .mockResolvedValue({ found: true, itchRecord: {}, message: 'ok' });
    jest
      .spyOn(initBrowser, 'initializeBrowser')
      .mockImplementation(async ({ onProgress: cb }) => {
        if (cb) {
          cb({ bytesReceived: 10, totalBytes: 100, fileName: 'file.zip' });
          cb({ bytesReceived: 50, totalBytes: 100, fileName: 'file.zip' });
        }
        return {
          browser: { close: jest.fn() } as any,
          status: true,
          message: 'ok',
        };
      });
    jest
      .spyOn(initiateDownload, 'initiateDownload')
      .mockResolvedValue({ status: true, message: 'ok' });
    jest.spyOn(waitFile, 'waitForFile').mockResolvedValue({
      status: true,
      message: 'done',
      filePath: path.join(tmpDir, 'file.zip'),
    });
    jest.spyOn(renameFileModule, 'renameFile').mockResolvedValue({
      status: true,
      message: 'renamed',
      newFilePath: path.join(tmpDir, 'file.zip'),
    });
    jest.spyOn(createFileModule, 'createFile').mockResolvedValue({} as any);

    await downloadGame({
      name: 'a',
      author: 'u',
      downloadDirectory: tmpDir,
      onProgress,
    });

    expect(onProgress).toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith({
      bytesReceived: 10,
      totalBytes: 100,
      fileName: 'file.zip',
    });
  });

  it('downloads using the itch API when apiKey is provided', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-api-'));
    jest.spyOn(fetchProfile, 'fetchItchGameProfile').mockResolvedValue({
      found: true,
      itchRecord: { id: 1, name: 'game', author: 'user' },
      message: 'ok',
    });
    const data = Buffer.from('abc');
    global.fetch = jest.fn();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ uploads: [{ id: 2, filename: 'game.zip' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => data.length.toString() },
        body: Readable.from(data),
        text: async () => '',
      });

    const result = (await downloadGame({
      name: 'game',
      author: 'user',
      apiKey: 'key',
      downloadDirectory: tmpDir,
    })) as any;
    expect(result.status).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'game.zip'))).toBe(true);
    (global.fetch as any).mockRestore?.();
  });

  it('uses ITCH_API_KEY env var when apiKey param is missing', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-env-'));
    process.env.ITCH_API_KEY = 'envkey';
    jest.spyOn(fetchProfile, 'fetchItchGameProfile').mockResolvedValue({
      found: true,
      itchRecord: { id: 2, name: 'game2', author: 'user2' },
      message: 'ok',
    });
    const data = Buffer.from('xyz');
    global.fetch = jest.fn();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ uploads: [{ id: 5, filename: 'game2.zip' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => data.length.toString() },
        body: Readable.from(data),
        text: async () => '',
      });

    const result = (await downloadGame({
      name: 'game2',
      author: 'user2',
      downloadDirectory: tmpDir,
    })) as any;
    expect(result.status).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'game2.zip'))).toBe(true);
    delete process.env.ITCH_API_KEY;
    (global.fetch as any).mockRestore?.();
  });

  it('rejects desiredFileName with path traversal (/)', async () => {
    const result = (await downloadGame({
      name: 'game',
      author: 'user',
      desiredFileName: '../../malicious',
    })) as any;

    expect(result.status).toBe(false);
    expect(result.message).toContain('path separators');
  });

  it('rejects desiredFileName with backslash', async () => {
    const result = (await downloadGame({
      name: 'game',
      author: 'user',
      desiredFileName: '..\\malicious',
    })) as any;

    expect(result.status).toBe(false);
    expect(result.message).toContain('path separators');
  });

  it('returns error for empty URL and no name/author', async () => {
    const result = (await downloadGame({})) as any;

    expect(result.status).toBe(false);
  });

  it('retries on failure then succeeds', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-retryfail-'));
    let callCount = 0;
    jest
      .spyOn(fetchProfile, 'fetchItchGameProfile')
      .mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('transient failure');
        }
        return {
          found: true,
          itchRecord: { name: 'game', author: 'user' },
          message: 'ok',
        } as any;
      });
    jest.spyOn(initBrowser, 'initializeBrowser').mockResolvedValue({
      browser: { close: jest.fn() } as any,
      status: true,
      message: 'ok',
    });
    jest
      .spyOn(initiateDownload, 'initiateDownload')
      .mockResolvedValue({ status: true, message: 'ok' });
    jest.spyOn(waitFile, 'waitForFile').mockResolvedValue({
      status: true,
      message: 'done',
      filePath: path.join(tmpDir, 'game.zip'),
    });
    jest.spyOn(renameFileModule, 'renameFile').mockResolvedValue({
      status: true,
      message: 'renamed',
      newFilePath: path.join(tmpDir, 'game.zip'),
    });
    jest.spyOn(createFileModule, 'createFile').mockResolvedValue({} as any);

    const result = (await downloadGame({
      name: 'game',
      author: 'user',
      downloadDirectory: tmpDir,
      retries: 1,
      retryDelayMs: 10,
    })) as any;

    expect(callCount).toBe(2);
    expect(result.status).toBe(true);
  });

  it('returns a buffer when inMemory is true', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-memory-'));
    jest.spyOn(fetchProfile, 'fetchItchGameProfile').mockResolvedValue({
      found: true,
      itchRecord: { id: 3, name: 'bufgame', author: 'user' },
      message: 'ok',
    });
    const data = Buffer.from('buf');
    global.fetch = jest.fn();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ uploads: [{ id: 9, filename: 'g.zip' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => data.length.toString() },
        body: Readable.from(data),
        text: async () => '',
      });

    const result = (await downloadGame({
      name: 'bufgame',
      author: 'user',
      apiKey: 'key',
      inMemory: true,
      downloadDirectory: tmpDir,
      writeMetaData: false,
    })) as any;

    expect(result.fileBuffer).toEqual(data);
    expect(result.filePath).toBeUndefined();
    expect(fs.readdirSync(tmpDir)).toEqual([]);
    (global.fetch as any).mockRestore?.();
  });

  it('html5 flag routes to downloadGameHtml5', async () => {
    // We need to mock the modules at this scope
    const downloadGameHtml5Module = await import('../downloadGameHtml5');
    const spy = jest
      .spyOn(downloadGameHtml5Module, 'downloadGameHtml5')
      .mockResolvedValue({
        status: true,
        message: 'HTML5 game downloaded: 3 assets.',
        html5Assets: ['index.html', 'game.js', 'style.css'],
      });

    const result = (await downloadGame({
      name: 'webgame',
      author: 'user',
      html5: true,
    })) as any;

    expect(result.status).toBe(true);
    expect(spy).toHaveBeenCalled();
    expect(result.message).toContain('HTML5');
    spy.mockRestore();
  });

  it('direct HTTP tried before Puppeteer', async () => {
    const spy = jest
      .spyOn(downloadGameDirectModule, 'downloadGameDirect')
      .mockResolvedValue({
        status: true,
        message: 'Download successful (direct HTTP).',
        filePath: '/tmp/game.zip',
      });

    const result = (await downloadGame({
      name: 'directgame',
      author: 'user',
    })) as any;

    expect(result.status).toBe(true);
    expect(spy).toHaveBeenCalled();
    expect(result.message).toContain('direct HTTP');
    spy.mockRestore();
  });

  it('returns actionable guidance when the optional browser is absent', async () => {
    jest.spyOn(puppeteerRuntime, 'loadPuppeteer').mockResolvedValue(null);
    const browserSpy = jest.spyOn(initBrowser, 'initializeBrowser');

    const result = (await downloadGame({
      itchGameUrl: 'https://author.itch.io/game',
    })) as any;

    expect(result.status).toBe(false);
    expect(result.message).toContain('Puppeteer is not installed');
    expect(result.message).toContain('Node.js 22.12');
    expect(browserSpy).not.toHaveBeenCalled();
  });

  it('does not launch Puppeteer for an unavailable page', async () => {
    jest
      .spyOn(downloadGameDirectModule, 'downloadGameDirect')
      .mockResolvedValue({
        status: false,
        message: 'Game page not found (HTTP 404).',
        httpStatus: 404,
        failReason: 'page_unavailable',
      });
    const browserSpy = jest.spyOn(initBrowser, 'initializeBrowser');

    const result = (await downloadGame({
      itchGameUrl: 'https://author.itch.io/removed',
    })) as any;

    expect(result.status).toBe(false);
    expect(result.httpStatus).toBe(404);
    expect(browserSpy).not.toHaveBeenCalled();
  });

  it('does not try a desktop browser fallback for a known HTML5-only game', async () => {
    const downloadGameHtml5Module = await import('../downloadGameHtml5');
    jest
      .spyOn(downloadGameDirectModule, 'downloadGameDirect')
      .mockResolvedValue({
        status: false,
        message: 'web-only HTML5 game — no downloadable files.',
        failReason: 'web_only',
      });
    jest.spyOn(downloadGameHtml5Module, 'downloadGameHtml5').mockResolvedValue({
      status: false,
      message: 'index.html returned HTTP 503',
      httpStatus: 503,
    });
    const browserSpy = jest.spyOn(initBrowser, 'initializeBrowser');

    const result = (await downloadGame({
      itchGameUrl: 'https://author.itch.io/web-game',
    })) as any;

    expect(result.status).toBe(false);
    expect(result.message).toContain('HTML5 download failed');
    expect(result.httpStatus).toBe(503);
    expect(browserSpy).not.toHaveBeenCalled();
  });

  it('reuses the direct probe page when auto-detecting an HTML5 game', async () => {
    const downloadGameHtml5Module = await import('../downloadGameHtml5');
    const pageHtml =
      '<iframe src="https://html-classic.itch.zone/html/123/index.html"></iframe>';
    jest
      .spyOn(downloadGameDirectModule, 'downloadGameDirect')
      .mockImplementation(async (_params, onHtml5Page) => {
        onHtml5Page?.(pageHtml);
        return {
          status: false,
          message: 'web-only HTML5 game — no downloadable files.',
          failReason: 'web_only',
        };
      });
    const html5Spy = jest
      .spyOn(downloadGameHtml5Module, 'downloadGameHtml5')
      .mockResolvedValue({
        status: true,
        message: 'HTML5 game downloaded: 1 assets.',
        html5Assets: ['index.html'],
      });

    const params = { itchGameUrl: 'https://author.itch.io/web-game' };
    const result = (await downloadGame(params)) as any;

    expect(result.status).toBe(true);
    expect(html5Spy).toHaveBeenCalledWith(params, { pageHtml });
  });

  it('applies delayBetweenMs between batch downloads', async () => {
    jest.spyOn(fetchProfile, 'fetchItchGameProfile').mockResolvedValue({
      found: true,
      itchRecord: { name: 'game' },
      message: 'ok',
    });

    const directSpy = jest
      .spyOn(downloadGameDirectModule, 'downloadGameDirect')
      .mockResolvedValue({
        status: true,
        message: 'ok',
      });

    const start = Date.now();
    await downloadGame(
      [
        { name: 'game1', author: 'user' },
        { name: 'game2', author: 'user' },
      ],
      { concurrency: 1, delayBetweenMs: 100 },
    );
    const elapsed = Date.now() - start;

    expect(directSpy).toHaveBeenCalledTimes(2);
    expect(elapsed).toBeGreaterThanOrEqual(80);
    directSpy.mockRestore();
  });

  it('passes platform param through to downloadGameDirect', async () => {
    const spy = jest
      .spyOn(downloadGameDirectModule, 'downloadGameDirect')
      .mockResolvedValue({
        status: true,
        message: 'ok',
      });

    await downloadGame({
      name: 'game',
      author: 'user',
      platform: 'linux',
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'linux' }),
      expect.any(Function),
    );
    spy.mockRestore();
  });
});
