import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { createDirectory } from '../src/fileUtils/createDirectory';
import { verifyFile } from '../src/fileUtils/verifyFile';

describe('file utilities', () => {
  it('creates a directory if it does not exist', async () => {
    const dir = path.join(os.tmpdir(), `itchio-test-${Date.now()}`);
    const result = await createDirectory({ directory: dir });
    expect(result.created).toBe(true);
    const verified = await verifyFile({ filePath: dir });
    expect(verified.exists).toBe(true);
    expect(verified.isDirectory).toBe(true);
    await fs.rm(dir, { recursive: true, force: true });
  });
});
