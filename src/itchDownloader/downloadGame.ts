import { Browser } from 'puppeteer';
import 'dotenv/config';
import { createFile } from '../fileUtils/createFile';
import { createDirectory } from '../fileUtils/createDirectory';
import { renameFile } from '../fileUtils/renameFile';
import { waitForFile } from '../fileUtils/waitForFile';
import { initiateDownload } from './initiateDownload';
import { initializeBrowser } from './initializeBrowser';
import { fetchItchGameProfile } from './fetchItchGameProfile';
import { downloadGameViaApi } from './downloadGameApi';
import { DownloadGameParams, DownloadGameResponse, IItchRecord } from './types';
import path from 'path';
import os from 'os';
import fs from 'fs';

function log(...args: unknown[]) {
  if (process.env.DEBUG_DOWNLOAD_GAME === 'true') {
    console.log(...args);
  }
}
// Track active browsers for cleanup on process exit
const activeBrowsers = new Set<Browser>();

export async function downloadGame(
  params: DownloadGameParams | DownloadGameParams[],
  concurrency = 1,
): Promise<DownloadGameResponse | DownloadGameResponse[]> {
  if (Array.isArray(params)) {
    const list = params as DownloadGameParams[];
    const runParallel = list.some((p) => p.parallel);
    if (runParallel) {
      return Promise.all(list.map((p) => downloadGameSingle(p)));
    }

    const limit = Math.max(concurrency, 1);
    const results: DownloadGameResponse[] = new Array(list.length);
    let index = 0;

    async function worker() {
      while (true) {
        const current = index++;
        if (current >= list.length) break;
        results[current] = await downloadGameSingle(list[current]);
      }
    }

    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.min(limit, list.length); i++) {
      workers.push(worker());
    }
    await Promise.all(workers);
    return results;
  } else {
    return downloadGameSingle(params);
  }
}

export async function downloadGameSingle(
  params: DownloadGameParams,
): Promise<DownloadGameResponse> {
  const {
    name,
    author,
    desiredFileName,
    downloadDirectory: inputDirectory,
    itchGameUrl: inputUrl,
    apiKey,
    writeMetaData = true,
    retries = 0,
    retryDelayMs = 500,
    navigationTimeoutMs = 30000,
    fileWaitTimeoutMs = 30000,
    onProgress,
  } = params;

  // Validate desiredFileName — prevent path traversal
  if (desiredFileName && (desiredFileName.includes('/') || desiredFileName.includes('\\'))) {
    return {
      status: false,
      message: 'Invalid desiredFileName: must not contain path separators.',
    };
  }

  let itchGameUrl: string | undefined = inputUrl;

  if (!itchGameUrl && name && author) {
    itchGameUrl = `https://${author}.itch.io/${name.toLowerCase().replace(/\s+/g, '-')}`;
  }
  const key = apiKey || process.env.ITCH_API_KEY;
  if (key) {
    return downloadGameViaApi({
      ...params,
      apiKey: key,
      itchGameUrl,
      downloadDirectory: inputDirectory ? path.resolve(inputDirectory) : undefined,
    });
  }
  const downloadDirectory: string = inputDirectory
    ? path.resolve(inputDirectory)
    : path.resolve(os.homedir(), 'downloads');
  log('Starting downloadGameSingle function...');
  let message = '';
  let status = false;
  let metaData = null;
  let metadataPath = '';
  let finalFilePath = '';
  let browserInit: {
    browser: Browser | null;
    status: boolean;
    message: string;
  } | null = null;

  if (!itchGameUrl || (!name && !author && !itchGameUrl)) {
    log('Invalid input parameters');
    return {
      status: false,
      message: 'Invalid input: Provide either a URL or both name and author.',
    };
  }

  async function attemptOnce(): Promise<DownloadGameResponse> {
    try {
      await createDirectory({ directory: downloadDirectory });

      const gameProfile = await fetchItchGameProfile({ itchGameUrl });
      if (!gameProfile.found) throw new Error('Failed to fetch game profile');
      log('Game profile fetched successfully:', itchGameUrl, gameProfile);

      browserInit = await initializeBrowser({ downloadDirectory, onProgress });
      if (!browserInit.status || !browserInit.browser)
        throw new Error(
          'Browser initialization failed: ' + browserInit.message,
        );

      activeBrowsers.add(browserInit.browser);
      const browser: Browser = browserInit.browser;
      log('Starting Download...');

      const puppeteerResult = await initiateDownload({
        browser,
        itchGameUrl: itchGameUrl!,
        navigationTimeoutMs,
      });
      if (!puppeteerResult.status)
        throw new Error('Download failed: ' + puppeteerResult.message);

      log('Downloading...');
      const downloadedFileInfo = await waitForFile({
        downloadDirectory,
        timeoutMs: fileWaitTimeoutMs,
      });
      if (!downloadedFileInfo.status)
        throw new Error('Downloaded file not found');

      finalFilePath = downloadedFileInfo.filePath as string;

      const originalBase = desiredFileName
        ? desiredFileName
        : path.basename(finalFilePath, path.extname(finalFilePath));
      const ext = path.extname(finalFilePath);
      let uniqueBase = originalBase;
      let targetPath = path.join(downloadDirectory, uniqueBase + ext);
      let counter = 1;
      while (fs.existsSync(targetPath)) {
        uniqueBase = `${originalBase}-${counter}`;
        targetPath = path.join(downloadDirectory, uniqueBase + ext);
        counter++;
      }
      if (uniqueBase !== path.basename(finalFilePath, ext) || desiredFileName) {
        const renameResult = await renameFile({
          filePath: finalFilePath,
          desiredFileName: uniqueBase,
        });
        if (!renameResult.status)
          throw new Error('File rename failed: ' + renameResult.message);
        finalFilePath = renameResult.newFilePath as string;
        log('File renamed successfully to:', finalFilePath);
      }

      metaData = gameProfile?.itchRecord as IItchRecord;
      metadataPath = path.join(
        downloadDirectory,
        `${gameProfile?.itchRecord?.name}-metadata.json`,
      );

      if (writeMetaData) {
        await createFile({
          filePath: metadataPath,
          content: JSON.stringify(metaData, null, 2),
        });
      }

      status = puppeteerResult.status;
      message = 'Download and file operations successful.';
      log(message);
      return {
        status,
        message,
        metadataPath,
        filePath: finalFilePath,
        metaData,
      };
    } catch (error: unknown) {
      message = `Setup failed: ${error instanceof Error ? error.message : String(error)}`;
      log(message);
      const httpStatus = (error as Record<string, unknown>).statusCode as number | undefined;
      if (finalFilePath) {
        return { status: false, message, httpStatus, filePath: finalFilePath };
      }
      return { status: false, message, httpStatus };
    } finally {
      if (browserInit?.browser) {
        try {
          await browserInit.browser.close();
        } catch {
          // Browser may already be closed
        }
        activeBrowsers.delete(browserInit.browser);
        log('Downloader closed successfully');
      }
    }
  }

  let attempt = 0;
  let result: DownloadGameResponse = await attemptOnce();
  while (!result.status && attempt < retries) {
    await new Promise((r) =>
      setTimeout(r, retryDelayMs * Math.pow(2, attempt)),
    );
    attempt++;
    result = await attemptOnce();
  }

  return result;
}

let cleanupRegistered = false;
function registerCleanup() {
  if (cleanupRegistered) return;
  cleanupRegistered = true;

  function cleanUp() {
    for (const browser of activeBrowsers) {
      try {
        browser.close();
      } catch {
        // Best-effort cleanup
      }
    }
    activeBrowsers.clear();
  }

  process.on('exit', cleanUp);
  process.on('SIGINT', () => {
    cleanUp();
    process.exit();
  });
}
registerCleanup();
