import { downloadGame } from '../src/itchDownloader/downloadGame';
import { DownloadGameParams } from '../src/itchDownloader/types';

async function downloadMultipleGamesExample() {
   const gameParams: DownloadGameParams[] = [
      { name: 'eyeless-jack', author: 'tayoodev' },
      { name: 'manic-miners', author: 'baraklava' }
   ];

   try {
      const results = await downloadGame(gameParams);
      console.log('Multiple Games Download Results:', results);
   } catch (error) {
      console.error('Error downloading multiple games:', error);
   }
}

downloadMultipleGamesExample();
