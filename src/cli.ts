#!/usr/bin/env node

import type { Argv, ArgumentsCamelCase } from 'yargs';
import 'dotenv/config';
import { downloadGame } from './itchDownloader/downloadGame';
import { downloadCollection } from './itchDownloader/downloadCollection';
import {
  DownloadGameParams,
  DownloadGameResponse,
  DownloadProgress,
} from './itchDownloader/types';
import { CLIArgs } from './types/cli';

export async function run(
  argvInput: string[] = process.argv,
  onProgress?: (info: DownloadProgress) => void,
) {
  const yargs = (await import('yargs')).default;
  const hideBin = (args: string[]) => args.slice(2);

  const argv: ArgumentsCamelCase<CLIArgs> = (
    yargs(hideBin(argvInput)) as Argv<CLIArgs>
  )
    .option('url', {
      describe: 'The full URL to the game on itch.io',
      type: 'string',
    })
    .option('collection', {
      describe: 'URL to an itch.io collection page',
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
    .option('apiKey', {
      describe: 'itch.io API key for authenticated downloads',
      type: 'string',
      default: process.env.ITCH_API_KEY,
    })
    .option('downloadDirectory', {
      describe: 'The filepath where the game will be downloaded',
      type: 'string',
    })
    .option('memory', {
      describe:
        'Store the downloaded file in memory instead of writing to disk',
      type: 'boolean',
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
    .option('concurrency', {
      describe:
        'Maximum number of simultaneous downloads when providing a list of games',
      type: 'number',
      default: 1,
    })
    .check((args) => {
      // Ensure a game or collection source is provided
      if (args.collection) {
        return true;
      } else if (args.url) {
        return true;
      } else if (args.name && args.author) {
        return true;
      }
      throw new Error(
        'Please provide either a collection URL, a game URL, or both name and author.',
      );
    })
    .help()
    .alias('help', 'h')
    .parseSync();

  const apiKey = argv.apiKey ?? process.env.ITCH_API_KEY;
  const concurrency =
    argv.concurrency !== undefined ? Number(argv.concurrency) : 1;

  if (argv.collection) {
    try {
      const result = await downloadCollection(argv.collection, apiKey, {
        downloadDirectory: argv.downloadDirectory,
        concurrency,
        onProgress,
      });
      console.log('Collection Download Result:', result);
    } catch (error) {
      console.error('Error downloading collection:', error);
    }
    return;
  }

  const params: DownloadGameParams = {
    itchGameUrl: argv.url,
    name: argv.name,
    author: argv.author,
  };
  if (apiKey) params.apiKey = apiKey;
  if (argv.downloadDirectory) params.downloadDirectory = argv.downloadDirectory;
  if (argv.memory) params.inMemory = true;
  if (argv.retries !== undefined) params.retries = Number(argv.retries);
  if (argv.retryDelay !== undefined)
    params.retryDelayMs = Number(argv.retryDelay);
  if (onProgress) {
    params.onProgress = onProgress;
  }

  try {
    const result = await downloadGame(params, concurrency);
    console.log('Game Download Result:', result);
  } catch (error) {
    console.error('Error downloading game:', error);
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  run(process.argv, ({ bytesReceived, totalBytes }) => {
    if (totalBytes) {
      const percent = ((bytesReceived / totalBytes) * 100).toFixed(2);
      process.stdout.write(`Download progress: ${percent}%\r`);
    } else {
      process.stdout.write(`Downloaded ${bytesReceived} bytes\r`);
    }
  });
}
