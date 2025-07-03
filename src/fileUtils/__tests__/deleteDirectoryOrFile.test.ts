import fs from 'fs';
import os from 'os';
import path from 'path';
import { deleteDirectoryOrFile } from '../deleteDirectoryOrFile';

describe('deleteDirectoryOrFile', () => {
  it('removes a file', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'delete-file-'));
    const file = path.join(tmpDir, 'test.txt');
    fs.writeFileSync(file, 'content');

    const result = await deleteDirectoryOrFile({ directoryPath: file });
    expect(result.deleted).toBe(true);
    expect(fs.existsSync(file)).toBe(false);
  });

  it('removes a directory recursively', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'delete-dir-'));
    const sub = path.join(dir, 'sub');
    fs.mkdirSync(sub);
    fs.writeFileSync(path.join(sub, 'a.txt'), 'a');

    const result = await deleteDirectoryOrFile({ directoryPath: dir });
    expect(result.deleted).toBe(true);
    expect(fs.existsSync(dir)).toBe(false);
  });

  it('returns false when path is missing', async () => {
    const missing = path.join(os.tmpdir(), `missing-${Date.now()}`);
    const result = await deleteDirectoryOrFile({ directoryPath: missing });
    expect(result.deleted).toBe(false);
  });
});
