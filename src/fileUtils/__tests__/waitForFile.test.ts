import fs from 'fs';
import os from 'os';
import path from 'path';
import { waitForFile } from '../waitForFile';

describe('waitForFile', () => {
  it('resolves when a .crdownload file finishes', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wait-file-success-'));

    // Create the .crdownload file AFTER a delay so the watcher sees it appear
    // then disappear, followed by the final file appearing.
    setTimeout(() => {
      const crdownload = path.join(tmpDir, 'testfile.crdownload');
      fs.writeFileSync(crdownload, 'partial');
      setTimeout(() => {
        fs.renameSync(crdownload, path.join(tmpDir, 'testfile.txt'));
      }, 200);
    }, 100);

    const result = await waitForFile({
      downloadDirectory: tmpDir,
      timeoutMs: 5000,
    });
    expect(result.status).toBe(true);
    expect(result.filePath).toBeDefined();
  });

  it('times out if file never completes download', async () => {
    // Create a directory with a .crdownload that never gets renamed
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wait-file-timeout-'));
    // Write the crdownload before starting the watcher so it's in the initial set
    fs.writeFileSync(path.join(tmpDir, 'stuck.crdownload'), 'partial');
    // Small delay to ensure filesystem settles before watcher starts
    await new Promise(r => setTimeout(r, 100));

    const start = Date.now();
    const result = await waitForFile({
      downloadDirectory: tmpDir,
      timeoutMs: 600,
    });
    const duration = Date.now() - start;
    expect(result.status).toBe(false);
    expect(duration).toBeGreaterThanOrEqual(500);
  });
});
