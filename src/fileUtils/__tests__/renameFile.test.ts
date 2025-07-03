import fs from 'fs';
import os from 'os';
import path from 'path';
import { renameFile } from '../renameFile';

describe('renameFile', () => {
  it('renames a file and keeps extension when none provided', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rename-file-'));
    const originalPath = path.join(tempDir, 'test.txt');
    fs.writeFileSync(originalPath, 'content');

    const result = await renameFile({ filePath: originalPath, desiredFileName: 'renamed' });
    expect(result.status).toBe(true);
    expect(result.newFilePath).toBe(path.join(tempDir, 'renamed.txt'));
    expect(fs.existsSync(result.newFilePath!)).toBe(true);
  });
});
