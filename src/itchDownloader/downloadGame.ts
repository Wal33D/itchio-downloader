import { Browser } from 'puppeteer';
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

function log(...args: any[]) {
  if (process.env.DEBUG_DOWNLOAD_GAME === 'true') {
    console.log(...args);
  }
}
let globalBrowser: Browser | null = null;

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
    onProgress,
  } = params;

  let downloadDirectory: string = inputDirectory
    ? path.resolve(inputDirectory)
    : path.resolve(os.homedir(), 'downloads');
  let itchGameUrl: string | undefined = inputUrl;

  if (!itchGameUrl && name && author) {
    itchGameUrl = `https://${author}.itch.io/${name.toLowerCase().replace(/\s+/g, '-')}`;
  }
  if (apiKey) {
    return downloadGameViaApi({
      ...params,
      itchGameUrl,
      downloadDirectory,
    });
  }
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
      if (!browserInit.status)
        throw new Error(
          'Browser initialization failed: ' + browserInit.message,
        );

      globalBrowser = browserInit.browser;

      const browser: Browser = globalBrowser!;
      log('Starting Download...');

      const puppeteerResult = await initiateDownload({
        browser,
        itchGameUrl: itchGameUrl!,
      });
      if (!puppeteerResult.status)
        throw new Error('Download failed: ' + puppeteerResult.message);

      log('Downloading...');
      const downloadedFileInfo = await waitForFile({ downloadDirectory });
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
        finalFilePath = renameResult.newFilePath as any;
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
    } catch (error: any) {
      message = `Setup failed: ${error.message}`;
      log(message);
      const httpStatus = error.statusCode;
      if (finalFilePath) {
        return { status: false, message, httpStatus, filePath: finalFilePath };
      }
      return { status: false, message, httpStatus };
    } finally {
      if (browserInit && browserInit.browser) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await browserInit.browser.close();
        log('Downloader closed successfully');
        globalBrowser = null;
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

process.on('exit', cleanUp);
process.on('SIGINT', () => {
  log('Process interrupted, closing browser...');
  cleanUp();
  process.exit();
});

function cleanUp() {
  log('Cleaning up resources...');
  if (globalBrowser) {
    globalBrowser.close();
    globalBrowser = null;
    log('Browser closed successfully.');
  }
}
