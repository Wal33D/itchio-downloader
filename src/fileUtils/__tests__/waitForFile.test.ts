import fs from 'fs';
import os from 'os';
import path from 'path';
import { waitForFile } from '../waitForFile';

describe('waitForFile', () => {
  it('resolves when .crdownload is renamed', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wait-file-'));
    const download = path.join(tempDir, 'file.crdownload');
    fs.writeFileSync(download, '');

    setTimeout(() => {
      fs.renameSync(download, path.join(tempDir, 'file.txt'));
    }, 300);

    const result = await waitForFile({ downloadDirectory: tempDir, timeoutMs: 2000 });
    expect(result.status).toBe(true);
    expect(result.filePath?.endsWith('file.txt')).toBe(true);
  });
});
