import { Browser } from 'puppeteer';

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
}: {
  browser: Browser;
  itchGameUrl: string;
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
    await page.goto(itchGameUrl, { waitUntil: 'networkidle2' });

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
    } catch (error: any) {}

    // If the main download button is not found, try the donation wall
    if (!downloadInitiated) {
      await page.goto(`${itchGameUrl}/purchase`, { waitUntil: 'networkidle2' });
      await new Promise((resolve) => setTimeout(resolve, randomDelay));

      const noThanksSelector = '.direct_download_btn';
      await page.waitForSelector(noThanksSelector, { timeout: 5000 });
      await page.click(noThanksSelector);

      const versionListBtn = '.download_btn';
      await page.waitForSelector(versionListBtn, { timeout: 5000 });
      // Click the first available version's download button
      await page.click(versionListBtn);

      message = 'Download initiated successfully from donation page.';
      downloadInitiated = true;
    }

    status = downloadInitiated;
  } catch (error: any) {
    message = `Error encountered during download: ${error.message}`;
    status = false;
  }

  return { status, message };
};
