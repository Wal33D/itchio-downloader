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

describe('downloadGame', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.DEBUG_DOWNLOAD_GAME;
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
});
