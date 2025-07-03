import fs from 'fs';
import os from 'os';
import path from 'path';
import { verifyFile } from '../verifyFile';

describe('verifyFile', () => {
  it('returns info for existing file', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-file-'));
    const filePath = path.join(tmpDir, 'test.txt');
    fs.writeFileSync(filePath, 'hello');

    const result = await verifyFile({ filePath });
    expect(result.exists).toBe(true);
    expect(result.isFile).toBe(true);
    expect(result.size).toBe(Buffer.byteLength('hello'));
  });

  it('indicates missing file', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-missing-'));
    const filePath = path.join(tmpDir, 'missing.txt');

    const result = await verifyFile({ filePath });
    expect(result.exists).toBe(false);
    expect(result.isFile).toBe(false);
  });
});
