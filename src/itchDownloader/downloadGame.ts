import { Browser } from 'puppeteer';
import { createFile } from '../fileUtils/createFile';
import { renameFile } from '../fileUtils/renameFile';
import { waitForFile } from '../fileUtils/waitForFile';
import { clearDirectory } from '../fileUtils/clearDirectory';
import { initiateDownload } from './initiateDownload';
import { initializeBrowser } from './initializeBrowser';
import { fetchItchGameProfile } from './fetchItchGameProfile';
import { setAndPrepareDownloadDirectory } from './setAndPrepareDownloadDirectory';
import { acquireLock, isLocked, releaseLock } from '../fileUtils/fileLock';
import { DownloadGameParams, DownloadGameResponse, IItchRecord } from './types';

let globalBrowser: Browser | null = null; // Globally accessible browser instance

export async function downloadGame(params: DownloadGameParams | DownloadGameParams[]): Promise<DownloadGameResponse | DownloadGameResponse[]> {
   if (Array.isArray(params)) {
      // Handle multiple game downloads
      const results: DownloadGameResponse[] = [];
      for (const param of params) {
         const result = await downloadGameSingle(param);
         results.push(result);
      }
      return results;
   } else {
      // Handle a single game download
      return downloadGameSingle(params);
   }
}

export async function downloadGameSingle(params: DownloadGameParams): Promise<DownloadGameResponse> {
   let { name, author, desiredFileName, desiredFileDirectory, itchGameUrl, cleanDirectory } = params;

   // Construct the itchGameUrl from name and author if not provided
   if (!itchGameUrl && name && author) {
      itchGameUrl = `https://${author}.itch.io/${name.toLowerCase().replace(/\s+/g, '-')}`;
   }
   console.log('Starting downloadGameSingle function...');
   let message = '';
   let status = false;
   let metaData = null;
   let metadataPath = '';
   let finalFilePath = '';
   let browserInit: { browser: Browser | null; status: boolean; message: string } | null = null;

   if (!itchGameUrl || (!name && !author && !itchGameUrl)) {
      console.log('Invalid input parameters');
      return { status: false, message: 'Invalid input: Provide either a URL or both name and author.' };
   }

   while (await isLocked()) {
      //@ts-ignore
      if (!browserInit || !browserInit?.browser) {
         await releaseLock();
      }
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Polling lock status
   }

   try {
      await acquireLock();

      const gameProfile = await fetchItchGameProfile({ itchGameUrl });
      if (!gameProfile.found) throw new Error('Failed to fetch game profile');
      console.log('Game profile fetched successfully:', itchGameUrl, gameProfile);

      const { userDataDir, downloadDirPath } = await setAndPrepareDownloadDirectory({
         applicationName: gameProfile.itchRecord?.name,
         downloadDirPath: desiredFileDirectory
      });

      console.log(`Download directory set`, downloadDirPath);

      browserInit = await initializeBrowser({ userDataDir });
      if (!browserInit.status) throw new Error('Browser initialization failed: ' + browserInit.message);

      if (cleanDirectory) {
         console.log(`Cleaning download directory at ${desiredFileDirectory}`);
         await clearDirectory({ directoryPath: downloadDirPath });
      }
      console.log(`Browser initialized successfully`, userDataDir);

      globalBrowser = browserInit.browser;

      const browser: Browser = globalBrowser!;
      console.log('Starting Download...');

      const puppeteerResult = await initiateDownload({ browser, itchGameUrl });
      if (!puppeteerResult.status) throw new Error('Download failed: ' + puppeteerResult.message);

      console.log('Downloading...');
      const downloadedFileInfo = await waitForFile({ downloadPath: downloadDirPath });
      if (!downloadedFileInfo.status) throw new Error('Downloaded file not found');

      finalFilePath = downloadedFileInfo.filePath as string;

      if (desiredFileName) {
         console.log('Renaming file...');
         const renameResult = await renameFile({ filePath: finalFilePath, desiredFileName });
         if (!renameResult.status) throw new Error('File rename failed: ' + renameResult.message);
         finalFilePath = renameResult.newFilePath as any;
         console.log('File renamed successfully to:', finalFilePath);
      }
      metaData = gameProfile?.itchRecord as IItchRecord;
      metadataPath = downloadDirPath + `\\${gameProfile?.itchRecord?.name}-metadata.json`;
      await createFile({
         filePath: metadataPath,
         content: JSON.stringify(metaData, null, 2)
      });

      status = puppeteerResult.status;
      message = 'Download and file operations successful.';
      console.log(message);
   } catch (error: any) {
      message = `Setup failed: ${error.message}`;
      console.log(message);
      if (finalFilePath) {
         return { status: false, message, filePath: finalFilePath };
      }
      return { status: false, message };
   } finally {
      await releaseLock();
      if (browserInit && browserInit.browser) {
         // Allow chrome to finish saving the file
         await new Promise((resolve) => setTimeout(resolve, 2000));

         await browserInit.browser.close();
         console.log('Downloader closed successfully');
         globalBrowser = null; // Clear the global browser reference
      }
   }

   return { status, message, metadataPath, filePath: finalFilePath, metaData };
}

// Handle cleanup on process exit or interruption
process.on('exit', cleanUp);
process.on('SIGINT', () => {
   console.log('Process interrupted, closing browser...');
   cleanUp();
   process.exit();
});

function cleanUp() {
   console.log('Cleaning up resources...');
   releaseLock();
   if (globalBrowser) {
      globalBrowser.close();
      globalBrowser = null;
      console.log('Browser closed successfully.');
   }
}
