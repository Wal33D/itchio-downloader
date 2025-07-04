import path from 'path';
import puppeteer, { Browser } from 'puppeteer';
import { DownloadProgress } from './types';

export const initializeBrowser = async ({
  downloadDirectory,
  headless = true,
  onProgress,
}: {
  downloadDirectory: string;
  headless?: boolean;
  onProgress?: (info: DownloadProgress) => void;
}): Promise<{ browser: Browser | null; status: boolean; message: string }> => {
  let message = '';
  let status = false;
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: headless, // Set to false for visual debugging or true for production
      defaultViewport: null, // Use the default screen size of the system
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // Create a new page in the browser
    const page = await browser.newPage();

    // Set a custom user agent and additional headers
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    );
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9', // Setting language preferences
    });

    // More settings to mimic a real user browser
    // Remove the WebDriver flag which can be detected
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: path.resolve(downloadDirectory),
    });
    await client.send('Browser.enable' as any);
    let totalBytes = 0;
    let fileName = '';
    client.on('Browser.downloadWillBegin', (event: any) => {
      totalBytes = event.totalBytes || 0;
      fileName = event.suggestedFilename || '';
      if (onProgress) {
        onProgress({ bytesReceived: 0, totalBytes, fileName });
      }
    });
    client.on('Browser.downloadProgress', (event: any) => {
      if (event.totalBytes) totalBytes = event.totalBytes;
      const bytes = event.receivedBytes || 0;
      if (onProgress) {
        onProgress({ bytesReceived: bytes, totalBytes, fileName });
      }
    });
    status = true;
    message = 'Browser initialized successfully with enhanced settings.';
  } catch (error: any) {
    message = `Failed to initialize browser: ${error.message}`;
    browser = null;
  }

  return { browser, status, message };
};
