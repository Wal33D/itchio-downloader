import fs from 'fs';
import os from 'os';
import path from 'path';
import { waitForFile } from '../waitForFile';

describe('waitForFile', () => {
  it('resolves when a .crdownload file finishes', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wait-file-success-'));
    const crdownload = path.join(tmpDir, 'testfile.crdownload');
    fs.writeFileSync(crdownload, '');

    setTimeout(() => {
      fs.renameSync(crdownload, path.join(tmpDir, 'testfile.txt'));
    }, 300);

    const result = await waitForFile({
      downloadDirectory: tmpDir,
      timeoutMs: 2000,
    });
    expect(result.status).toBe(true);
    expect(result.filePath).toBe(path.join(tmpDir, 'testfile.txt'));
  });

  it('times out if file never completes', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wait-file-timeout-'));
    const crdownload = path.join(tmpDir, 'fail.crdownload');
    fs.writeFileSync(crdownload, '');

    const start = Date.now();
    const result = await waitForFile({
      downloadDirectory: tmpDir,
      timeoutMs: 500,
    });
    const duration = Date.now() - start;
    expect(result.status).toBe(false);
    expect(duration).toBeGreaterThanOrEqual(500);
  });
});
