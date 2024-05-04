import path from 'path';
import { downloadGame } from '../itchDownloader/downloadGame';
import { DownloadGameParams } from '../itchDownloader/types';

const preferedDownloadDirectory = path.join(__dirname, '..', '..', 'testOutput');

async function downloadSingleGameExample() {
   const params: DownloadGameParams = {
      itchGameUrl: 'https://baraklava.itch.io/manic-miners', // Specify the game URL or the author and name
      desiredFileDirectory: preferedDownloadDirectory, //optional directory to save the game
      cleanDirectory: true //optionally, wipe old downloads with with the same name.
   };

   try {
      const result = await downloadGame(params);
      console.log('Single Game Download Result:', result);
   } catch (error) {
      console.error('Error downloading game:', error);
   }
}

downloadSingleGameExample();
