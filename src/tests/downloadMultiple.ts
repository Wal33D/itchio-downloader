import path from 'path';
import { downloadGame } from '../itchDownloader/downloadGame';
import { DownloadGameParams } from '../itchDownloader/types';

const preferedDownloadDirectory = path.join(__dirname, '..', '..', 'testOutput');

async function downloadMultipleGamesExample() {
   const gameParams: DownloadGameParams[] = [
      { name: 'eyeless-jack', author: 'tayoodev', desiredFileDirectory: preferedDownloadDirectory },
      { itchGameUrl: 'https://baraklava.itch.io/manic-miners', desiredFileDirectory: preferedDownloadDirectory },
      { itchGameUrl: 'https://orangepixel.itch.io/gauntlet-of-power', desiredFileDirectory: preferedDownloadDirectory }
   ];

   try {
      const results = await downloadGame(gameParams);
      console.log('Multiple Games Download Results:', results);
   } catch (error) {
      console.error('Error downloading multiple games:', error);
   }
}

downloadMultipleGamesExample();
