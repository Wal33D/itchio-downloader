import type { Browser } from 'puppeteer';
import 'dotenv/config';
import { createFile } from '../fileUtils/createFile';
import { createDirectory } from '../fileUtils/createDirectory';
import { renameFile } from '../fileUtils/renameFile';
import { waitForFile } from '../fileUtils/waitForFile';
import { fetchItchGameProfile } from './fetchItchGameProfile';
import { downloadGameViaApi } from './downloadGameApi';
import { downloadGameDirect } from './downloadGameDirect';
import { downloadGameHtml5 } from './downloadGameHtml5';
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

export interface DownloadGameOptions {
  /** Maximum number of concurrent downloads (default: 1) */
  concurrency?: number;
  /** Delay in ms between each download to rate-limit requests (default: 0) */
  delayBetweenMs?: number;
}

export async function downloadGame(
  params: DownloadGameParams | DownloadGameParams[],
  concurrencyOrOptions: number | DownloadGameOptions = 1,
): Promise<DownloadGameResponse | DownloadGameResponse[]> {
  const opts: DownloadGameOptions =
    typeof concurrencyOrOptions === 'number'
      ? { concurrency: concurrencyOrOptions }
      : concurrencyOrOptions;
  const concurrency = Math.max(opts.concurrency ?? 1, 1);
  const delayMs = opts.delayBetweenMs ?? 0;

  if (Array.isArray(params)) {
    const list = params as DownloadGameParams[];
    const runParallel = list.some((p) => p.parallel);
    if (runParallel) {
      return Promise.all(list.map((p) => downloadGameSingle(p)));
    }

    const results: DownloadGameResponse[] = new Array(list.length);
    let index = 0;

    async function worker() {
      while (true) {
        const current = index++;
        if (current >= list.length) break;
        results[current] = await downloadGameSingle(list[current]);
        if (delayMs > 0 && index < list.length) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }

    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.min(concurrency, list.length); i++) {
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

  // === PATH 1: API key (most reliable) ===
  const key = apiKey || process.env.ITCH_API_KEY;
  if (key) {
    return downloadGameViaApi({
      ...params,
      apiKey: key,
      itchGameUrl,
      downloadDirectory: inputDirectory ? path.resolve(inputDirectory) : undefined,
    });
  }

  // === PATH 2: Explicit HTML5 request ===
  if (params.html5) {
    return downloadGameHtml5(params);
  }

  // === PATH 3: Direct HTTP (no Puppeteer, no API key) ===
  log('Attempting direct HTTP download...');
  const directResult = await downloadGameDirect(params);
  if (directResult.status) {
    return directResult;
  }
  log('Direct HTTP failed:', directResult.message);

  // === PATH 4: Auto-detect HTML5 web game ===
  if (
    directResult.message.includes('web-only') ||
    directResult.message.includes('No uploads found') ||
    directResult.message.includes('no downloadable files')
  ) {
    log('Attempting HTML5 web game download...');
    const html5Result = await downloadGameHtml5(params);
    if (html5Result.status) {
      return html5Result;
    }
    log('HTML5 download failed:', html5Result.message);
  }

  // === PATH 5: Puppeteer fallback (optional dependency) ===
  let puppeteerModule: typeof import('puppeteer') | null = null;
  try {
    puppeteerModule = await import('puppeteer');
  } catch {
    // Puppeteer not installed
  }

  if (!puppeteerModule) {
    return {
      status: false,
      message:
        'Direct HTTP download failed and Puppeteer is not installed. ' +
        'Install puppeteer as an optional dependency, or provide an API key. ' +
        `Direct error: ${directResult.message}`,
    };
  }

  // Puppeteer path — existing logic
  const downloadDirectory: string = inputDirectory
    ? path.resolve(inputDirectory)
    : path.resolve(os.homedir(), 'downloads');

  if (!itchGameUrl || (!name && !author && !itchGameUrl)) {
    return {
      status: false,
      message: 'Invalid input: Provide either a URL or both name and author.',
    };
  }

  let browserInit: {
    browser: Browser | null;
    status: boolean;
    message: string;
  } | null = null;

  async function attemptPuppeteer(): Promise<DownloadGameResponse> {
    let message = '';
    let status = false;
    let metaData = null;
    let metadataPath = '';
    let finalFilePath = '';

    try {
      await createDirectory({ directory: downloadDirectory });

      const gameProfile = await fetchItchGameProfile({ itchGameUrl });
      if (!gameProfile.found) throw new Error('Failed to fetch game profile');

      const { initializeBrowser } = await import('./initializeBrowser');
      browserInit = await initializeBrowser({ downloadDirectory, onProgress });
      if (!browserInit.status || !browserInit.browser)
        throw new Error('Browser initialization failed: ' + browserInit.message);

      activeBrowsers.add(browserInit.browser);
      const browser: Browser = browserInit.browser;

      const { initiateDownload } = await import('./initiateDownload');
      const puppeteerResult = await initiateDownload({
        browser,
        itchGameUrl: itchGameUrl!,
        navigationTimeoutMs,
      });
      if (!puppeteerResult.status)
        throw new Error('Download failed: ' + puppeteerResult.message);

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
      return { status, message, metadataPath, filePath: finalFilePath, metaData };
    } catch (error: unknown) {
      message = `Setup failed: ${error instanceof Error ? error.message : String(error)}`;
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
      }
    }
  }

  let attempt = 0;
  let result: DownloadGameResponse = await attemptPuppeteer();
  while (!result.status && attempt < retries) {
    await new Promise((r) =>
      setTimeout(r, retryDelayMs * Math.pow(2, attempt)),
    );
    attempt++;
    result = await attemptPuppeteer();
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
