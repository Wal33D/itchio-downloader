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

  it('renames file with both name and extension', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rename-file-'));
    const original = path.join(tmpDir, 'old.txt');
    fs.writeFileSync(original, 'data');

    const result = await renameFile({
      filePath: original,
      desiredFileName: 'newname',
      desiredFileExt: 'md',
    });
    expect(result.status).toBe(true);
    const newPath = path.join(tmpDir, 'newname.md');
    expect(result.newFilePath).toBe(newPath);
    expect(fs.existsSync(newPath)).toBe(true);
  });

  it('fails when source file does not exist', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rename-file-'));
    const missing = path.join(tmpDir, 'nonexistent.txt');

    const result = await renameFile({
      filePath: missing,
      desiredFileName: 'new',
    });
    expect(result.status).toBe(false);
    expect(result.message).toContain('Failed to rename file');
  });

  it('fails when neither name nor ext provided', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rename-file-'));
    const original = path.join(tmpDir, 'old.txt');
    fs.writeFileSync(original, 'data');

    const result = await renameFile({
      filePath: original,
    });
    expect(result.status).toBe(false);
    expect(result.message).toContain('desiredFileName or desiredFileExt must be provided');
  });
});
