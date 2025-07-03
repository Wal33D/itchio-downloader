import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'assert';
import { waitForFile } from '../src/fileUtils/waitForFile';

async function runTests() {
  // Success scenario
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wait-file-success-'));
  const crdownload = path.join(tempDir, 'testfile.crdownload');
  fs.writeFileSync(crdownload, '');

  setTimeout(() => {
    fs.renameSync(crdownload, path.join(tempDir, 'testfile.txt'));
  }, 300);

  const result = await waitForFile({ downloadDirectory: tempDir, timeoutMs: 2000 });
  assert.strictEqual(result.status, true, 'Expected success status');
  assert.ok(result.filePath?.endsWith('testfile.txt'), 'Expected final file path');
  console.log('Success scenario passed');

  // Timeout scenario
  const tempDirTimeout = fs.mkdtempSync(path.join(os.tmpdir(), 'wait-file-timeout-'));
  const crdownloadTimeout = path.join(tempDirTimeout, 'fail.crdownload');
  fs.writeFileSync(crdownloadTimeout, '');

  const start = Date.now();
  const timeoutResult = await waitForFile({ downloadDirectory: tempDirTimeout, timeoutMs: 1000 });
  const duration = Date.now() - start;
  assert.strictEqual(timeoutResult.status, false, 'Expected timeout status');
  assert.ok(duration >= 1000, 'Should wait at least timeout');
  console.log('Timeout scenario passed');
}

runTests().catch(err => {
  console.error('Tests failed:', err);
  process.exit(1);
});
