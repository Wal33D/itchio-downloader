jest.mock('yargs/helpers', () => ({
  __esModule: true,
  hideBin: (argv: string[]) => argv.slice(2),
}));

jest.mock('yargs', () => {
  return {
    __esModule: true,
    default: (args: string[]) => {
      let checkFn: ((a: any) => any) | undefined;
      const self: any = {
        option: () => self,
        check: (fn: (a: any) => any) => {
          checkFn = fn;
          return self;
        },
        help: () => self,
        alias: () => self,
        version: () => self,
        parseSync: () => {
          const result: any = {};
          for (let i = 0; i < args.length; i++) {
            const key = args[i];
            if (!key.startsWith('--')) continue;
            const name = key.slice(2);
            const next = args[i + 1];
            if (next && !next.startsWith('--')) {
              result[name] = next;
              i++;
            } else {
              result[name] = true;
            }
          }
          try {
            if (checkFn) checkFn(result);
            return result;
          } catch (err) {
            // mimic yargs exiting the process on validation error

            (process.exit as any)(1);
            throw err;
          }
        },
      };
      return self;
    },
  };
});

import * as downloadGameModule from '../itchDownloader/downloadGame';
import * as downloadCollectionModule from '../itchDownloader/downloadCollection';
import { run } from '../cli';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('cli', () => {
  beforeEach(() => {
    delete process.env.ITCH_API_KEY;
  });
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.ITCH_API_KEY;
    process.exitCode = undefined;
  });

  it('passes url argument to downloadGame', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue({ status: true, message: 'ok' } as any);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await run([
      'node',
      'cli.ts',
      '--url',
      'https://author.itch.io/game',
      '--downloadDirectory',
      '/tmp',
    ]);

    expect(mock).toHaveBeenCalledWith(
      {
        itchGameUrl: 'https://author.itch.io/game',
        name: undefined,
        author: undefined,
        downloadDirectory: '/tmp',
      },
      { concurrency: 1, delayBetweenMs: 0 },
    );
    expect(logSpy).toHaveBeenCalled();
  });

  it('passes apiKey argument', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue({ status: true, message: 'ok' } as any);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await run([
      'node',
      'cli.ts',
      '--url',
      'https://author.itch.io/game',
      '--apiKey',
      '123',
    ]);

    expect(mock).toHaveBeenCalledWith(
      {
        itchGameUrl: 'https://author.itch.io/game',
        name: undefined,
        author: undefined,
        apiKey: '123',
        downloadDirectory: undefined,
      },
      { concurrency: 1, delayBetweenMs: 0 },
    );
    expect(logSpy).toHaveBeenCalled();
  });

  it('uses ITCH_API_KEY env var when --apiKey is omitted', async () => {
    process.env.ITCH_API_KEY = 'abc';
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue({ status: true, message: 'ok' } as any);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await run(['node', 'cli.ts', '--url', 'https://author.itch.io/game']);

    expect(mock).toHaveBeenCalledWith(
      {
        itchGameUrl: 'https://author.itch.io/game',
        name: undefined,
        author: undefined,
        apiKey: 'abc',
        downloadDirectory: undefined,
      },
      { concurrency: 1, delayBetweenMs: 0 },
    );
    expect(logSpy).toHaveBeenCalled();
    delete process.env.ITCH_API_KEY;
  });

  it('passes name and author arguments', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue({ status: true, message: 'done' } as any);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await run(['node', 'cli.ts', '--name', 'game', '--author', 'user']);

    expect(mock).toHaveBeenCalledWith(
      {
        itchGameUrl: undefined,
        name: 'game',
        author: 'user',
        downloadDirectory: undefined,
      },
      { concurrency: 1, delayBetweenMs: 0 },
    );
    expect(logSpy).toHaveBeenCalled();
  });

  it('passes retry options', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue({ status: true, message: 'ok' } as any);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await run([
      'node',
      'cli.ts',
      '--url',
      'https://author.itch.io/game',
      '--retries',
      '2',
      '--retryDelay',
      '100',
    ]);

    expect(mock).toHaveBeenCalledWith(
      {
        itchGameUrl: 'https://author.itch.io/game',
        name: undefined,
        author: undefined,
        downloadDirectory: undefined,
        retries: 2,
        retryDelayMs: 100,
      },
      { concurrency: 1, delayBetweenMs: 0 },
    );
    expect(logSpy).toHaveBeenCalled();
  });

  it('forwards concurrency option', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue({ status: true, message: 'ok' } as any);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await run([
      'node',
      'cli.ts',
      '--url',
      'https://author.itch.io/game',
      '--concurrency',
      '3',
    ]);

    expect(mock).toHaveBeenCalledWith(
      {
        itchGameUrl: 'https://author.itch.io/game',
        name: undefined,
        author: undefined,
        downloadDirectory: undefined,
      },
      { concurrency: 3, delayBetweenMs: 0 },
    );
    expect(logSpy).toHaveBeenCalled();
  });

  it('passes memory flag', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue({ status: true, message: 'ok' } as any);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await run([
      'node',
      'cli.ts',
      '--url',
      'https://author.itch.io/game',
      '--memory',
    ]);

    expect(mock).toHaveBeenCalledWith(
      {
        itchGameUrl: 'https://author.itch.io/game',
        name: undefined,
        author: undefined,
        downloadDirectory: undefined,
        inMemory: true,
      },
      { concurrency: 1, delayBetweenMs: 0 },
    );
    expect(logSpy).toHaveBeenCalled();
  });

  it('handles collection option', async () => {
    const mock = jest
      .spyOn(downloadCollectionModule, 'downloadCollection')
      .mockResolvedValue({ status: true, message: 'col' } as any);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await run([
      'node',
      'cli.ts',
      '--collection',
      'https://itch.io/c/1/test',
      '--concurrency',
      '2',
      '--delay',
      '250',
    ]);

    expect(mock).toHaveBeenCalledWith('https://itch.io/c/1/test', undefined, {
      downloadDirectory: undefined,
      concurrency: 2,
      delayBetweenMs: 250,
      onProgress: undefined,
      resume: undefined,
      noCookieCache: undefined,
      cookieCacheDir: undefined,
    });
    expect(logSpy).toHaveBeenCalled();
  });

  it('exits when required arguments are missing', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((
      code?: number,
    ) => {
      throw new Error(`exit ${code}`);
    }) as never);

    await expect(run(['node', 'cli.ts', '--name', 'game'])).rejects.toThrow(
      'exit 1',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('logs errors from downloadGame', async () => {
    jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockRejectedValue(new Error('fail'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await run(['node', 'cli.ts', '--url', 'https://author.itch.io/game']);

    expect(errorSpy).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('sets a failure exit code when downloadGame returns an error result', async () => {
    jest.spyOn(downloadGameModule, 'downloadGame').mockResolvedValue({
      status: false,
      message: 'not found',
      httpStatus: 404,
    } as any);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await run(['node', 'cli.ts', '--url', 'https://author.itch.io/missing']);

    expect(errorSpy).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('passes --html5 flag to params', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue({
        status: true,
        message: 'ok',
        html5Assets: ['index.html'],
      } as any);
    jest.spyOn(console, 'log').mockImplementation(() => {});

    await run([
      'node',
      'cli.ts',
      '--url',
      'https://author.itch.io/game',
      '--html5',
    ]);

    expect(mock).toHaveBeenCalledWith(
      expect.objectContaining({ html5: true }),
      expect.any(Object),
    );
  });

  it('passes --platform flag to params', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue({ status: true, message: 'ok' } as any);
    jest.spyOn(console, 'log').mockImplementation(() => {});

    await run([
      'node',
      'cli.ts',
      '--url',
      'https://author.itch.io/game',
      '--platform',
      'linux',
    ]);

    expect(mock).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'linux' }),
      expect.any(Object),
    );
  });

  it('passes --resume flag to params', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue({ status: true, message: 'ok' } as any);
    jest.spyOn(console, 'log').mockImplementation(() => {});

    await run([
      'node',
      'cli.ts',
      '--url',
      'https://author.itch.io/game',
      '--resume',
    ]);

    expect(mock).toHaveBeenCalledWith(
      expect.objectContaining({ resume: true }),
      expect.any(Object),
    );
  });

  it('passes --noCookieCache flag to params', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue({ status: true, message: 'ok' } as any);
    jest.spyOn(console, 'log').mockImplementation(() => {});

    await run([
      'node',
      'cli.ts',
      '--url',
      'https://author.itch.io/game',
      '--noCookieCache',
    ]);

    expect(mock).toHaveBeenCalledWith(
      expect.objectContaining({ noCookieCache: true }),
      expect.any(Object),
    );
  });

  it('passes --cookieCacheDir to params', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue({ status: true, message: 'ok' } as any);
    jest.spyOn(console, 'log').mockImplementation(() => {});

    await run([
      'node',
      'cli.ts',
      '--url',
      'https://author.itch.io/game',
      '--cookieCacheDir',
      '/tmp/cache',
    ]);

    expect(mock).toHaveBeenCalledWith(
      expect.objectContaining({ cookieCacheDir: '/tmp/cache' }),
      expect.any(Object),
    );
  });

  it('collection passes --resume flag', async () => {
    const mock = jest
      .spyOn(downloadCollectionModule, 'downloadCollection')
      .mockResolvedValue({ status: true, message: 'ok' } as any);
    jest.spyOn(console, 'log').mockImplementation(() => {});

    await run([
      'node',
      'cli.ts',
      '--collection',
      'https://itch.io/c/1/test',
      '--resume',
    ]);

    expect(mock).toHaveBeenCalledWith(
      'https://itch.io/c/1/test',
      undefined,
      expect.objectContaining({ resume: true }),
    );
  });

  it('collection passes --noCookieCache flag', async () => {
    const mock = jest
      .spyOn(downloadCollectionModule, 'downloadCollection')
      .mockResolvedValue({ status: true, message: 'ok' } as any);
    jest.spyOn(console, 'log').mockImplementation(() => {});

    await run([
      'node',
      'cli.ts',
      '--collection',
      'https://itch.io/c/1/test',
      '--noCookieCache',
    ]);

    expect(mock).toHaveBeenCalledWith(
      'https://itch.io/c/1/test',
      undefined,
      expect.objectContaining({ noCookieCache: true }),
    );
  });

  it('passes --delay flag as delayBetweenMs', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue({ status: true, message: 'ok' } as any);
    jest.spyOn(console, 'log').mockImplementation(() => {});

    await run([
      'node',
      'cli.ts',
      '--url',
      'https://author.itch.io/game',
      '--delay',
      '500',
    ]);

    expect(mock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ delayBetweenMs: 500 }),
    );
  });

  it('downloads every game from a YAML config and merges CLI overrides', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'itchio-cli-config-test-'));
    const configPath = join(directory, 'games.yaml');
    writeFileSync(
      configPath,
      [
        'defaults:',
        '  downloadDirectory: ./from-config',
        '  retries: 2',
        '  concurrency: 2',
        '  delay: 50',
        'games:',
        '  - https://author.itch.io/one',
        '  - name: Game Two',
        '    author: author',
        '    html5: true',
      ].join('\n'),
    );
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue([
        { status: true, message: 'one' },
        { status: true, message: 'two' },
      ] as any);
    jest.spyOn(console, 'log').mockImplementation(() => {});

    try {
      await run([
        'node',
        'cli.ts',
        '--config',
        configPath,
        '--downloadDirectory',
        './override',
        '--retries',
        '4',
        '--concurrency',
        '3',
        '--delay',
        '10',
      ]);

      expect(mock).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            itchGameUrl: 'https://author.itch.io/one',
            downloadDirectory: './override',
            retries: 4,
          }),
          expect.objectContaining({
            name: 'Game Two',
            author: 'author',
            html5: true,
            downloadDirectory: './override',
            retries: 4,
          }),
        ],
        { concurrency: 3, delayBetweenMs: 10 },
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('uses config batch defaults when CLI overrides are omitted', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'itchio-cli-config-test-'));
    const configPath = join(directory, 'games.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        defaults: { concurrency: 2, delay: 25 },
        games: ['https://author.itch.io/one'],
      }),
    );
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue([{ status: true, message: 'one' }] as any);
    jest.spyOn(console, 'log').mockImplementation(() => {});

    try {
      await run(['node', 'cli.ts', '--config', configPath]);
      expect(mock).toHaveBeenCalledWith(expect.any(Array), {
        concurrency: 2,
        delayBetweenMs: 25,
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('reports invalid config files without starting downloads', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'itchio-cli-config-test-'));
    const configPath = join(directory, 'games.json');
    writeFileSync(configPath, JSON.stringify({ games: [] }));
    const mock = jest.spyOn(downloadGameModule, 'downloadGame');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await run(['node', 'cli.ts', '--config', configPath]);
      expect(mock).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Config.games must be a non-empty array'),
      );
      expect(process.exitCode).toBe(1);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
