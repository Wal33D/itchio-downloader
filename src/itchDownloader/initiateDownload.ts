import { PuppeteerBrowser } from './puppeteerRuntime';

/**
 * Initiates a download for a game from the Itch.io website using Puppeteer.
 * The function navigates to the game's URL, attempts to find and click the download button.
 * If the main download button is not found, it proceeds to the donation wall and tries to download from there.
 *
 * @param {Browser} browser - The Puppeteer Browser instance to use for downloading.
 * @param {string} itchGameUrl - The URL of the game's page on Itch.io.
 * @returns {Promise<{status: boolean; message: string}>} The result of the download attempt, including success status and message.
 */
export const initiateDownload = async ({
  browser,
  itchGameUrl,
  navigationTimeoutMs = 30000,
}: {
  browser: PuppeteerBrowser;
  itchGameUrl: string;
  navigationTimeoutMs?: number;
}): Promise<{ status: boolean; message: string }> => {
  let message = '';
  let status = false;
  let downloadInitiated = false;

  try {
    const page = await browser.newPage();

    // Set user-like viewport for the browser
    await page.setViewport({
      width: 1920,
      height: 1080,
    });

    // Navigate to the game's page
    const gamePageResponse = await page.goto(itchGameUrl, {
      waitUntil: 'networkidle2',
      timeout: navigationTimeoutMs,
    });
    if (gamePageResponse && gamePageResponse.status() >= 400) {
      return {
        status: false,
        message: `Game page returned HTTP ${gamePageResponse.status()}. The page may be private, restricted, or no longer available.`,
      };
    }

    // Calculate a random delay to simulate human interaction before clicking the download button
    const randomDelay = Math.floor(Math.random() * 3000) + 1000;

    // Attempt to click the main download button
    try {
      const downloadLinkSelector = '.button.download_btn';
      await page.waitForSelector(downloadLinkSelector, { timeout: 5000 });
      await new Promise((resolve) => setTimeout(resolve, randomDelay));
      await page.click(downloadLinkSelector);
      downloadInitiated = true;
      message = 'Download initiated successfully from main page.';
    } catch (btnError: unknown) {
      // Main download button (.button.download_btn) not found — fall through to donation wall
      const detail = btnError instanceof Error ? btnError.message : String(btnError);
      message = `Main download button not found (${detail}), trying donation wall...`;
    }

    // If the main download button is not found, try the donation wall
    if (!downloadInitiated) {
      const html5Embed = await page.$(
        '.html_embed_widget, .game_frame, iframe[src*="itch.zone/html/"]',
      );
      if (html5Embed) {
        return {
          status: false,
          message:
            'This is an HTML5 browser game with no desktop download. Retry with --html5.',
        };
      }

      const purchaseResponse = await page.goto(`${itchGameUrl}/purchase`, {
        waitUntil: 'networkidle2',
        timeout: navigationTimeoutMs,
      });
      if (purchaseResponse && purchaseResponse.status() >= 400) {
        return {
          status: false,
          message: `Donation page returned HTTP ${purchaseResponse.status()}. The game may not provide a downloadable file.`,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, randomDelay));

      const noThanksSelector = '.direct_download_btn';
      const noThanksButton = await page.$(noThanksSelector);
      if (!noThanksButton) {
        return {
          status: false,
          message:
            'No free-download option was found. The game may be paid, private, or browser-only (use --html5 for browser games).',
        };
      }
      await page.click(noThanksSelector);

      const versionListBtn = '.download_btn';
      await page.waitForSelector(versionListBtn, { timeout: 5000 });
      // Click the first available version's download button
      await page.click(versionListBtn);

      message = 'Download initiated successfully from donation page.';
      downloadInitiated = true;
    }

    status = downloadInitiated;
  } catch (error: unknown) {
    message = `Error encountered during download: ${error instanceof Error ? error.message : String(error)}`;
    status = false;
  }

  return { status, message };
};
