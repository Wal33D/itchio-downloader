import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { downloadGame } from './itchDownloader/downloadGame';
import { DownloadGameParams } from './itchDownloader/types';

const argv: any = yargs(hideBin(process.argv))
   .option('name', {
      describe: 'The name of the game to download',
      type: 'string'
   })
   .option('author', {
      describe: 'The author of the game',
      type: 'string'
   })
   .option('filepath', {
      describe: 'The filepath where the game will be downloaded',
      type: 'string'
   })
   .option('cleanDirectory', {
      describe: 'Whether to clean the directory before downloading',
      type: 'boolean',
      default: false
   })
   .demandOption(['name', 'author', 'filepath'], 'Please provide both name, author, and filepath to download the game')
   .help()
   .alias('help', 'h')
   .parse();

const params: DownloadGameParams = {
   name: argv.name,
   author: argv.author,
   desiredFileDirectory: argv.filepath,
   cleanDirectory: argv.cleanDirectory
};

async function run() {
   try {
      const result = await downloadGame(params);
      console.log('Game Download Result:', result);
   } catch (error) {
      console.error('Error downloading game:', error);
   }
}

run();
