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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

describe('cli', () => {
  beforeEach(() => {
    delete process.env.ITCH_API_KEY;
  });
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.ITCH_API_KEY;
  });

  it('passes url argument to downloadGame', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue('ok' as any);
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
      1,
    );
    expect(logSpy).toHaveBeenCalledWith('Game Download Result:', 'ok');
  });

  it('passes apiKey argument', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue('ok' as any);
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
      1,
    );
    expect(logSpy).toHaveBeenCalled();
  });

  it('uses ITCH_API_KEY env var when --apiKey is omitted', async () => {
    process.env.ITCH_API_KEY = 'abc';
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue('ok' as any);
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
      1,
    );
    expect(logSpy).toHaveBeenCalled();
    delete process.env.ITCH_API_KEY;
  });

  it('passes name and author arguments', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue('done' as any);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await run(['node', 'cli.ts', '--name', 'game', '--author', 'user']);

    expect(mock).toHaveBeenCalledWith(
      {
        itchGameUrl: undefined,
        name: 'game',
        author: 'user',
        downloadDirectory: undefined,
      },
      1,
    );
    expect(logSpy).toHaveBeenCalled();
  });

  it('passes retry options', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue('ok' as any);
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
      1,
    );
    expect(logSpy).toHaveBeenCalled();
  });

  it('forwards concurrency option', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue('ok' as any);
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
      3,
    );
    expect(logSpy).toHaveBeenCalled();
  });

  it('passes memory flag', async () => {
    const mock = jest
      .spyOn(downloadGameModule, 'downloadGame')
      .mockResolvedValue('ok' as any);
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
      1,
    );
    expect(logSpy).toHaveBeenCalled();
  });

  it('handles collection option', async () => {
    const mock = jest
      .spyOn(downloadCollectionModule, 'downloadCollection')
      .mockResolvedValue('col' as any);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await run([
      'node',
      'cli.ts',
      '--collection',
      'https://itch.io/c/1/test',
      '--concurrency',
      '2',
    ]);

    expect(mock).toHaveBeenCalledWith('https://itch.io/c/1/test', undefined, {
      downloadDirectory: undefined,
      concurrency: 2,
      onProgress: undefined,
    });
    expect(logSpy).toHaveBeenCalledWith('Collection Download Result:', 'col');
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
  });
});
