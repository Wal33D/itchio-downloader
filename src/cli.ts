#!/usr/bin/env node

import type { Argv, ArgumentsCamelCase } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { downloadGame } from './itchDownloader/downloadGame';
import { DownloadGameParams } from './itchDownloader/types';
import { CLIArgs } from './types/cli';

export async function run(argvInput: string[] = process.argv) {
  const yargs = (await import('yargs')).default;

  const argv: ArgumentsCamelCase<CLIArgs> = (
    yargs(hideBin(argvInput)) as Argv<CLIArgs>
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
    .option('concurrency', {
      describe:
        'Maximum number of simultaneous downloads when passing an array of games',
      type: 'number',
      default: 1,
    })
    .check((args) => {
      // Ensure either URL is provided or both name and author are provided
      if (args.url) {
        return true;
      } else if (args.name && args.author) {
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

  const concurrency = Number(argv.concurrency ?? 1);

  try {
    const result = await downloadGame(params, concurrency);
    console.log('Game Download Result:', result);
  } catch (error) {
    console.error('Error downloading game:', error);
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  run();
}
