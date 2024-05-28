import { downloadGame } from '../itchDownloader/downloadGame';
import { DownloadGameParams } from '../itchDownloader/types';

async function downloadSingleGameExample() {
   const params: DownloadGameParams = {
      itchGameUrl: 'https://baraklava.itch.io/manic-miners', // Specify the game URL or the author and name
      desiredFileName: 'manic-miners-latest'
   };

   try {
      const result = await downloadGame(params);
      console.log('Single Game Download Result:', result);
   } catch (error) {
      console.error('Error downloading game:', error);
   }
}

downloadSingleGameExample();
