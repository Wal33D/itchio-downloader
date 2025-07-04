#!/usr/bin/env node

import type { Argv, ArgumentsCamelCase } from 'yargs';
import { downloadGame } from './itchDownloader/downloadGame';
import { DownloadGameParams } from './itchDownloader/types';
import { CLIArgs } from './types/cli';

export async function run(argvInput: string[] = process.argv) {
  const yargs = (await import('yargs')).default;
  const hideBin = (args: string[]) => args.slice(2);

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
    .option('retries', {
      describe: 'Number of retry attempts on failure',
      type: 'number',
      default: 0,
    })
    .option('retryDelay', {
      describe: 'Base delay in ms for exponential backoff',
      type: 'number',
      default: 500,
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
    retries: argv.retries !== undefined ? Number(argv.retries) : undefined,
    retryDelayMs:
      argv.retryDelay !== undefined ? Number(argv.retryDelay) : undefined,
  };

  try {
    const result = await downloadGame(params);
    console.log('Game Download Result:', result);
  } catch (error) {
    console.error('Error downloading game:', error);
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  run();
}
