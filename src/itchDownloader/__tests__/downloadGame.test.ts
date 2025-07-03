import fs from 'fs';
import os from 'os';
import path from 'path';
import { downloadGame } from '../downloadGame';
import * as fetchProfile from '../fetchItchGameProfile';
import * as initBrowser from '../initializeBrowser';
import * as initiateDownload from '../initiateDownload';
import * as waitFile from '../../fileUtils/waitForFile';
import * as renameFileModule from '../../fileUtils/renameFile';
import * as createFileModule from '../../fileUtils/createFile';

describe('downloadGame', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('processes a download using mocks', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-test-'));
    const itchRecord = { name: 'game', author: 'user', title: 'Game', itchMetaDataUrl: '', domain: 'itch.io' };

    jest.spyOn(fetchProfile, 'fetchItchGameProfile').mockResolvedValue({ found: true, itchRecord, message: 'ok' });
    const closeMock = jest.fn();
    jest.spyOn(initBrowser, 'initializeBrowser').mockResolvedValue({ browser: { close: closeMock } as any, status: true, message: 'ok' });
    jest.spyOn(initiateDownload, 'initiateDownload').mockResolvedValue({ status: true, message: 'ok' });
    jest.spyOn(waitFile, 'waitForFile').mockResolvedValue({ status: true, message: 'done', filePath: path.join(tmpDir, 'game.zip') });
    jest.spyOn(renameFileModule, 'renameFile').mockResolvedValue({ status: true, message: 'renamed', newFilePath: path.join(tmpDir, 'renamed.zip') });
    const createSpy = jest.spyOn(createFileModule, 'createFile').mockResolvedValue({} as any);

    const result = await downloadGame({ name: 'game', author: 'user', desiredFileName: 'renamed', downloadDirectory: tmpDir }) as any;

    expect(result.status).toBe(true);
    expect(result.filePath).toBe(path.join(tmpDir, 'renamed.zip'));
    expect(result.metadataPath).toBe(path.join(tmpDir, 'game-metadata.json'));
    expect(result.metaData).toEqual(itchRecord);
    expect(createSpy).toHaveBeenCalledWith({
      filePath: path.join(tmpDir, 'game-metadata.json'),
      content: JSON.stringify(itchRecord, null, 2)
    });
    expect(closeMock).toHaveBeenCalled();
  });

  it('handles errors from fetchItchGameProfile', async () => {
    jest.spyOn(fetchProfile, 'fetchItchGameProfile').mockRejectedValue(new Error('fail'));

    const result = await downloadGame({ name: 'game', author: 'user' }) as any;

    expect(result.status).toBe(false);
    expect(result.message).toContain('fail');
  });
});
