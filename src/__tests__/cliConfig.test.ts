import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadCliConfig, validateCliConfig } from '../cliConfig';

describe('CLI config files', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'itchio-config-test-'));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('loads and normalizes a JSON config', () => {
    const configPath = join(directory, 'games.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        defaults: { downloadDirectory: './games', concurrency: 2 },
        games: [
          'https://author.itch.io/one',
          { name: 'Game Two', author: 'author', html5: true },
        ],
      }),
    );

    expect(loadCliConfig(configPath)).toEqual({
      defaults: { downloadDirectory: './games', concurrency: 2 },
      games: [
        { url: 'https://author.itch.io/one' },
        { name: 'Game Two', author: 'author', html5: true },
      ],
    });
  });

  it('loads a YAML config', () => {
    const configPath = join(directory, 'games.yaml');
    writeFileSync(
      configPath,
      'defaults:\n  retries: 2\n  resume: true\ngames:\n  - https://author.itch.io/one\n',
    );

    expect(loadCliConfig(configPath)).toEqual({
      defaults: { retries: 2, resume: true },
      games: [{ url: 'https://author.itch.io/one' }],
    });
  });

  it('rejects an empty games list', () => {
    expect(() => validateCliConfig({ games: [] })).toThrow(
      'Config.games must be a non-empty array.',
    );
  });

  it('rejects entries without a URL or name and author', () => {
    expect(() =>
      validateCliConfig({ games: [{ name: 'incomplete' }] }),
    ).toThrow('must provide "url" or both "name" and "author"');
  });

  it('rejects unknown and invalid options', () => {
    expect(() =>
      validateCliConfig({ games: ['https://author.itch.io/one'], extra: true }),
    ).toThrow('unknown property "extra"');
    expect(() =>
      validateCliConfig({
        defaults: { concurrency: 0 },
        games: ['https://author.itch.io/one'],
      }),
    ).toThrow('Config.defaults.concurrency has an invalid value.');
  });

  it('rejects unsupported file extensions', () => {
    const configPath = join(directory, 'games.txt');
    writeFileSync(configPath, '{}');

    expect(() => loadCliConfig(configPath)).toThrow(
      'expected a .json, .yaml, or .yml file',
    );
  });
});
