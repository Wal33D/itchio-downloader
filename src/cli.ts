#!/usr/bin/env node

import yargs, { Argv, ArgumentsCamelCase } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { downloadGame } from './itchDownloader/downloadGame';
import { DownloadGameParams } from './itchDownloader/types';
import { CLIArgs } from './types/cli';
const argv: ArgumentsCamelCase<CLIArgs> = (
  yargs(hideBin(process.argv)) as Argv<CLIArgs>
)
  .option('url', {
    describe: 'The full URL to the game on itch.io',
    type: 'string',
  })
  .option('name', {
    describe: 'The name of the game to download',
    type: 'string',
  })
  .option('author', {
    describe: 'The author of the game',
    type: 'string',
  })
  .option('downloadDirectory', {
    describe: 'The filepath where the game will be downloaded',
    type: 'string',
  })

  .check((argv) => {
    // Ensure either URL is provided or both name and author are provided
    if (argv.url) {
      return true;
    } else if (argv.name && argv.author) {
      return true;
    } else {
      throw new Error('Please provide either a URL or both name and author.');
    }
  })
  .help()
  .alias('help', 'h')
  .parseSync();

const params: DownloadGameParams = {
  itchGameUrl: argv.url,
  name: argv.name,
  author: argv.author,
  downloadDirectory: argv.downloadDirectory,
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
