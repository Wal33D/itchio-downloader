import path from 'path';
import fs from 'fs';
import type { Browser } from 'puppeteer';
import { DownloadProgress } from './types';

function findBrowserExecutable(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  if (process.platform !== 'linux') return undefined;
  return [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
  ].find((candidate) => fs.existsSync(candidate));
}

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
    const puppeteer = await import('puppeteer');
    const executablePath = findBrowserExecutable();
    browser = await puppeteer.default.launch({
      headless,
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ...(executablePath ? { executablePath } : {}),
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    );
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    // Set up CDP session for download handling
    const client = await page.createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: path.resolve(downloadDirectory),
    });

    // Track download progress via CDP Page events (compatible with Chrome 120+).
    // Puppeteer's CDPSession type doesn't expose the .on() method for page-level
    // events, so we cast to a minimal interface. This targets Puppeteer v24+.
    if (onProgress) {
      const cdpClient = client as unknown as {
        on(
          event: string,
          handler: (params: Record<string, unknown>) => void,
        ): void;
      };

      let totalBytes = 0;
      let fileName = '';

      cdpClient.on(
        'Page.downloadWillBegin',
        (event: Record<string, unknown>) => {
          fileName = (event.suggestedFilename as string) || '';
          onProgress({ bytesReceived: 0, totalBytes: 0, fileName });
        },
      );

      cdpClient.on(
        'Page.downloadProgress',
        (event: Record<string, unknown>) => {
          if (event.totalBytes) totalBytes = event.totalBytes as number;
          const bytes = (event.receivedBytes as number) || 0;
          onProgress({ bytesReceived: bytes, totalBytes, fileName });
        },
      );
    }

    status = true;
    message = 'Browser initialized successfully.';
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    message =
      `Failed to initialize browser: ${detail}. ` +
      'Install Chromium or set PUPPETEER_EXECUTABLE_PATH to a Chrome/Chromium executable.';
    // Close browser if it launched but setup failed (prevents orphaned Chrome processes)
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Best-effort cleanup
      }
    }
    browser = null;
  }

  return { browser, status, message };
};
