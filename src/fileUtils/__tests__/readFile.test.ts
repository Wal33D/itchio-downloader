import fs from 'fs';
import os from 'os';
import path from 'path';
import { readFile } from '../readFile';

describe('readFile', () => {
  it('reads a single file', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'read-file-'));
    const filePath = path.join(tempDir, 'file.txt');
    fs.writeFileSync(filePath, 'hello');
    const result = await readFile({ filePaths: filePath }) as any;
    expect(result.read).toBe(true);
    expect(result.content).toBe('hello');
  });
});
