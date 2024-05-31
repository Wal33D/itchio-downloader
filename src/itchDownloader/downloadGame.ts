import { Browser } from 'puppeteer';
import { createFile } from '../fileUtils/createFile';
import { renameFile } from '../fileUtils/renameFile';
import { waitForFile } from '../fileUtils/waitForFile';
import { initiateDownload } from './initiateDownload';
import { initializeBrowser } from './initializeBrowser';
import { fetchItchGameProfile } from './fetchItchGameProfile';
import { DownloadGameParams, DownloadGameResponse, IItchRecord } from './types';
import path from 'path';
import os from 'os';
let globalBrowser: Browser | null = null;

export async function downloadGame(params: DownloadGameParams | DownloadGameParams[]): Promise<DownloadGameResponse | DownloadGameResponse[]> {
   if (Array.isArray(params)) {
      const results: DownloadGameResponse[] = [];
      for (const param of params) {
         const result = await downloadGameSingle(param);
         results.push(result);
      }
      return results;
   } else {
      return downloadGameSingle(params);
   }
}

export async function downloadGameSingle(params: DownloadGameParams): Promise<DownloadGameResponse> {
   let { name, author, desiredFileName, downloadDirectory, itchGameUrl, writeMetaData = true } = params;

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
   if (!downloadDirectory) {
      downloadDirectory = path.resolve(os.homedir(), 'downloads');
   } else {
      downloadDirectory = path.resolve(downloadDirectory);
   }

   try {
      const gameProfile = await fetchItchGameProfile({ itchGameUrl });
      if (!gameProfile.found) throw new Error('Failed to fetch game profile');
      console.log('Game profile fetched successfully:', itchGameUrl, gameProfile);

      browserInit = await initializeBrowser({ downloadDirectory });
      if (!browserInit.status) throw new Error('Browser initialization failed: ' + browserInit.message);

      globalBrowser = browserInit.browser;

      const browser: Browser = globalBrowser!;
      console.log('Starting Download...');

      const puppeteerResult = await initiateDownload({ browser, itchGameUrl });
      if (!puppeteerResult.status) throw new Error('Download failed: ' + puppeteerResult.message);

      console.log('Downloading...');
      const downloadedFileInfo = await waitForFile({ downloadDirectory });
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
      metadataPath = downloadDirectory + `\\${gameProfile?.itchRecord?.name}-metadata.json`;

      if (writeMetaData) {
         await createFile({
            filePath: metadataPath,
            content: JSON.stringify(metaData, null, 2)
         });
      }

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
      if (browserInit && browserInit.browser) {
         await new Promise((resolve) => setTimeout(resolve, 2000));

         await browserInit.browser.close();
         console.log('Downloader closed successfully');
         globalBrowser = null;
      }
   }

   return { status, message, metadataPath, filePath: finalFilePath, metaData };
}

process.on('exit', cleanUp);
process.on('SIGINT', () => {
   console.log('Process interrupted, closing browser...');
   cleanUp();
   process.exit();
});

function cleanUp() {
   console.log('Cleaning up resources...');
   if (globalBrowser) {
      globalBrowser.close();
      globalBrowser = null;
      console.log('Browser closed successfully.');
   }
}
