import fs from 'fs';
import os from 'os';
import path from 'path';
import { createFile } from '../createFile';

describe('createFile', () => {
  it('creates a single file', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-file-'));
    const filePath = path.join(tmpDir, 'single.txt');

    const result = await createFile({ filePath, content: 'hello' }) as any;
    expect(result.created).toBe(true);
    expect(result.exists).toBe(true);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(result.overwritten).toBe(false);
    expect(result.hasParentDirectory).toBe(true);
  });

  it('creates multiple files', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-files-'));
    const files = [
      { filePath: path.join(tmpDir, 'a.txt'), content: 'a' },
      { filePath: path.join(tmpDir, 'b.txt'), content: 'b' }
    ];

    const results = await createFile(files) as any[];
    expect(results).toHaveLength(2);
    results.forEach((r) => expect(r.created).toBe(true));
    expect(fs.existsSync(files[0].filePath)).toBe(true);
    expect(fs.existsSync(files[1].filePath)).toBe(true);
  });
});
