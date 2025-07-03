import fs from 'fs';
import os from 'os';
import path from 'path';
import { renameFile } from '../renameFile';

describe('renameFile', () => {
  it('renames a file keeping extension', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rename-file-'));
    const original = path.join(tmpDir, 'old.txt');
    fs.writeFileSync(original, 'data');

    const result = await renameFile({
      filePath: original,
      desiredFileName: 'new',
    });
    expect(result.status).toBe(true);
    const newPath = path.join(tmpDir, 'new.txt');
    expect(result.newFilePath).toBe(newPath);
    expect(fs.existsSync(newPath)).toBe(true);
    expect(fs.existsSync(original)).toBe(false);
  });

  it('renames a file with new extension', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rename-file-'));
    const original = path.join(tmpDir, 'old.txt');
    fs.writeFileSync(original, 'data');

    const result = await renameFile({
      filePath: original,
      desiredFileExt: 'md',
    });
    expect(result.status).toBe(true);
    const newPath = path.join(tmpDir, 'old.md');
    expect(result.newFilePath).toBe(newPath);
    expect(fs.existsSync(newPath)).toBe(true);
    expect(fs.existsSync(original)).toBe(false);
  });
});
