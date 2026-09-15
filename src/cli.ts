#!/usr/bin/env node

import type { Argv, ArgumentsCamelCase } from 'yargs';
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { downloadGame } from './itchDownloader/downloadGame';
import { downloadCollection } from './itchDownloader/downloadCollection';
import { downloadJam } from './itchDownloader/downloadJam';
import {
  DownloadGameParams,
  DownloadGameResponse,
  DownloadProgress,
} from './itchDownloader/types';
import { CLIArgs } from './types/cli';
import {
  CliConfigDefaults,
  CliConfigGame,
  CliConfigGameOptions,
  loadCliConfig,
} from './cliConfig';

const packageVersion = (
  JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8')) as {
    version: string;
  }
).version;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function renderProgressBar(info: DownloadProgress): void {
  if (!process.stdout.isTTY) return;
  const { bytesReceived, totalBytes, fileName } = info;
  const cols = Math.min(process.stdout.columns || 80, 100);
  const label = fileName ? fileName.slice(0, 20) : 'download';

  if (totalBytes && totalBytes > 0) {
    const pct = Math.min(bytesReceived / totalBytes, 1);
    const barWidth = Math.max(cols - 45, 10);
    const filled = Math.round(barWidth * pct);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);
    const pctStr = (pct * 100).toFixed(1).padStart(5);
    process.stdout.write(
      `\r  ${label.padEnd(20)} ${bar} ${pctStr}% ${formatBytes(bytesReceived)}/${formatBytes(totalBytes)}`,
    );
  } else {
    process.stdout.write(
      `\r  ${label.padEnd(20)} ${formatBytes(bytesReceived)} downloaded...`,
    );
  }
}

function printResult(
  label: string,
  result: DownloadGameResponse | DownloadGameResponse[],
): boolean {
  const results = Array.isArray(result) ? result : [result];
  let succeeded = true;

  for (const r of results) {
    if (r.status) {
      console.log(`\n  \u2714 ${r.message}`);
      if (r.filePath) console.log(`    File: ${r.filePath}`);
      if (r.metadataPath) console.log(`    Metadata: ${r.metadataPath}`);
      if (r.metaData?.title) console.log(`    Title: ${r.metaData.title}`);
      if (r.fileBuffer)
        console.log(`    Buffer: ${formatBytes(r.fileBuffer.length)}`);
      if (r.html5Assets)
        console.log(`    Assets: ${r.html5Assets.length} files`);
      if (r.bytesDownloaded)
        console.log(`    Size: ${formatBytes(r.bytesDownloaded)}`);
      if (r.sizeVerified === false)
        console.log(`    \u26a0 Size verification failed`);
      if (r.resumed) console.log(`    \u21bb Resumed from partial download`);
    } else {
      succeeded = false;
      console.error(`\n  \u2718 ${r.message}`);
      if (r.httpStatus) console.error(`    HTTP Status: ${r.httpStatus}`);
    }
  }

  return succeeded;
}

const configurableOptionNames: (keyof CliConfigGameOptions)[] = [
  'apiKey',
  'downloadDirectory',
  'memory',
  'html5',
  'platform',
  'retries',
  'retryDelay',
  'resume',
  'noCookieCache',
  'cookieCacheDir',
];

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function providedOptions(argvInput: string[]): Set<string> {
  return new Set(
    argvInput
      .slice(2)
      .filter((argument) => argument.startsWith('--'))
      .map((argument) => argument.slice(2).split('=', 1)[0]),
  );
}

function optionWasProvided(options: Set<string>, name: string): boolean {
  return options.has(name) || options.has(toKebabCase(name));
}

function configCliOverrides(
  argv: ArgumentsCamelCase<CLIArgs>,
  explicitOptions: Set<string>,
): CliConfigGameOptions {
  const overrides: CliConfigGameOptions = {};
  for (const name of configurableOptionNames) {
    if (optionWasProvided(explicitOptions, name) && argv[name] !== undefined) {
      const value =
        name === 'retries' || name === 'retryDelay'
          ? Number(argv[name])
          : argv[name];
      Object.assign(overrides, { [name]: value });
    }
  }
  return overrides;
}

function configGameParams(
  game: CliConfigGame,
  defaults: CliConfigDefaults,
  overrides: CliConfigGameOptions,
  onProgress?: (info: DownloadProgress) => void,
): DownloadGameParams {
  const merged = { ...defaults, ...game, ...overrides };
  const params: DownloadGameParams = {
    itchGameUrl: merged.url,
    name: merged.name,
    author: merged.author,
    downloadDirectory: merged.downloadDirectory,
  };
  const apiKey = merged.apiKey ?? process.env.ITCH_API_KEY;
  if (apiKey) params.apiKey = apiKey;
  if (merged.memory) params.inMemory = true;
  if (merged.html5) params.html5 = true;
  if (merged.platform) params.platform = merged.platform;
  if (merged.retries !== undefined) params.retries = merged.retries;
  if (merged.retryDelay !== undefined) params.retryDelayMs = merged.retryDelay;
  if (merged.resume) params.resume = true;
  if (merged.noCookieCache) params.noCookieCache = true;
  if (merged.cookieCacheDir) params.cookieCacheDir = merged.cookieCacheDir;
  if (onProgress) params.onProgress = onProgress;
  return params;
}

export async function run(
  argvInput: string[] = process.argv,
  onProgress?: (info: DownloadProgress) => void,
) {
  const yargs = (await import('yargs')).default;
  const hideBin = (args: string[]) => args.slice(2);

  const argv: ArgumentsCamelCase<CLIArgs> = (
    yargs(hideBin(argvInput)) as Argv<CLIArgs>
  )
    .option('config', {
      describe: 'Path to a JSON or YAML batch configuration file',
      type: 'string',
    })
    .option('url', {
      describe: 'The full URL to the game on itch.io',
      type: 'string',
    })
    .option('collection', {
      describe: 'URL to an itch.io collection page',
      type: 'string',
    })
    .option('jam', {
      describe: 'URL to an itch.io game jam (downloads all entries)',
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
    .option('html5', {
      describe: 'Download HTML5 web game assets for offline play',
      type: 'boolean',
    })
    .option('platform', {
      describe: 'Preferred platform (windows, linux, osx)',
      type: 'string',
    })
    .option('delay', {
      describe: 'Delay in ms between batch downloads for rate limiting',
      type: 'number',
      default: 0,
    })
    .option('resume', {
      describe: 'Resume interrupted downloads using Range headers',
      type: 'boolean',
    })
    .option('noCookieCache', {
      describe: 'Disable cookie caching (cookies are cached by default)',
      type: 'boolean',
    })
    .option('cookieCacheDir', {
      describe: 'Directory for cookie cache (default: system tmpdir)',
      type: 'string',
    })
    .check((args) => {
      if (args.config) {
        if (
          args.collection ||
          args.jam ||
          args.url ||
          args.name ||
          args.author
        ) {
          throw new Error(
            '--config cannot be combined with --collection, --jam, --url, --name, or --author.',
          );
        }
        return true;
      } else if (args.collection) {
        return true;
      } else if (args.jam) {
        return true;
      } else if (args.url) {
        return true;
      } else if (args.name && args.author) {
        return true;
      }
      throw new Error(
        'Please provide a config file, collection URL, jam URL, game URL, or both name and author.',
      );
    })
    .help()
    .alias('help', 'h')
    .version(packageVersion)
    .parseSync();

  const apiKey = argv.apiKey ?? process.env.ITCH_API_KEY;
  const concurrency =
    argv.concurrency !== undefined ? Number(argv.concurrency) : 1;
  const delay = argv.delay !== undefined ? Number(argv.delay) : 0;

  if (argv.config) {
    try {
      const config = loadCliConfig(argv.config);
      const explicitOptions = providedOptions(argvInput);
      const overrides = configCliOverrides(argv, explicitOptions);
      const configConcurrency = optionWasProvided(
        explicitOptions,
        'concurrency',
      )
        ? concurrency
        : (config.defaults.concurrency ?? 1);
      const configDelay = optionWasProvided(explicitOptions, 'delay')
        ? Number(argv.delay)
        : (config.defaults.delay ?? 0);
      const params = config.games.map((game) =>
        configGameParams(game, config.defaults, overrides, onProgress),
      );

      console.log(
        `\n  Downloading ${params.length} game${params.length === 1 ? '' : 's'} from config: ${argv.config}\n`,
      );
      const result = await downloadGame(params, {
        concurrency: configConcurrency,
        delayBetweenMs: configDelay,
      });
      if (!printResult('Config', result)) {
        process.exitCode = 1;
      }
    } catch (error) {
      console.error(
        `\n  \u2718 Config download failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exitCode = 1;
    }
    return;
  }

  if (argv.collection) {
    try {
      console.log(`\n  Downloading collection: ${argv.collection}\n`);
      const result = await downloadCollection(argv.collection, apiKey, {
        downloadDirectory: argv.downloadDirectory,
        concurrency,
        delayBetweenMs: delay,
        onProgress,
        resume: argv.resume,
        noCookieCache: argv.noCookieCache,
        cookieCacheDir: argv.cookieCacheDir,
      });
      if (!printResult('Collection', result as DownloadGameResponse)) {
        process.exitCode = 1;
      }
    } catch (error) {
      console.error(
        `\n  \u2718 Collection download failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exitCode = 1;
    }
    return;
  }

  if (argv.jam) {
    try {
      console.log(`\n  Downloading jam: ${argv.jam}\n`);
      const result = await downloadJam(argv.jam, apiKey, {
        downloadDirectory: argv.downloadDirectory,
        concurrency,
        delayBetweenMs: delay,
        onProgress,
        resume: argv.resume,
        noCookieCache: argv.noCookieCache,
        cookieCacheDir: argv.cookieCacheDir,
      });
      if (!printResult('Jam', result as DownloadGameResponse)) {
        process.exitCode = 1;
      }
    } catch (error) {
      console.error(
        `\n  \u2718 Jam download failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exitCode = 1;
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
  if (argv.html5) params.html5 = true;
  if (argv.platform) params.platform = argv.platform;
  if (argv.retries !== undefined) params.retries = Number(argv.retries);
  if (argv.retryDelay !== undefined)
    params.retryDelayMs = Number(argv.retryDelay);
  if (argv.resume) params.resume = true;
  if (argv.noCookieCache) params.noCookieCache = true;
  if (argv.cookieCacheDir) params.cookieCacheDir = argv.cookieCacheDir;
  if (onProgress) {
    params.onProgress = onProgress;
  }

  try {
    console.log(
      `\n  Downloading: ${params.itchGameUrl || `${params.author}/${params.name}`}\n`,
    );
    const result = await downloadGame(params, {
      concurrency,
      delayBetweenMs: delay,
    });
    if (!printResult('Game', result)) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(
      `\n  \u2718 Download failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void run(process.argv, renderProgressBar);
}
