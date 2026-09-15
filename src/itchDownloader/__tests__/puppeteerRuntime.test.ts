import { loadPuppeteer } from '../puppeteerRuntime';

describe('loadPuppeteer', () => {
  it('returns null when the optional browser package is not installed', async () => {
    await expect(
      loadPuppeteer('itchio-downloader-test-missing-browser-package'),
    ).resolves.toBeNull();
  });
});
