import { readFileSync } from 'fs';
import { extname, resolve } from 'path';
import { parse as parseYaml } from 'yaml';

export interface CliConfigGameOptions {
  apiKey?: string;
  downloadDirectory?: string;
  memory?: boolean;
  html5?: boolean;
  platform?: string;
  retries?: number;
  retryDelay?: number;
  resume?: boolean;
  noCookieCache?: boolean;
  cookieCacheDir?: string;
}

export interface CliConfigDefaults extends CliConfigGameOptions {
  concurrency?: number;
  delay?: number;
}

export interface CliConfigGame extends CliConfigGameOptions {
  url?: string;
  name?: string;
  author?: string;
}

export interface CliConfig {
  defaults: CliConfigDefaults;
  games: CliConfigGame[];
}

const gameOptionValidators: Record<
  keyof CliConfigGameOptions,
  (value: unknown) => boolean
> = {
  apiKey: isString,
  downloadDirectory: isString,
  memory: isBoolean,
  html5: isBoolean,
  platform: (value) =>
    typeof value === 'string' && ['windows', 'linux', 'osx'].includes(value),
  retries: isNonNegativeInteger,
  retryDelay: isNonNegativeNumber,
  resume: isBoolean,
  noCookieCache: isBoolean,
  cookieCacheDir: isString,
};

const defaultValidators: Record<
  keyof CliConfigDefaults,
  (value: unknown) => boolean
> = {
  ...gameOptionValidators,
  concurrency: isPositiveInteger,
  delay: isNonNegativeNumber,
};

const gameValidators: Record<keyof CliConfigGame, (value: unknown) => boolean> =
  {
    ...gameOptionValidators,
    url: isString,
    name: isString,
    author: isString,
  };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return isNonNegativeNumber(value) && Number.isInteger(value);
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value >= 1;
}

function validateKnownProperties(
  value: Record<string, unknown>,
  validators: Record<string, (property: unknown) => boolean>,
  label: string,
): void {
  for (const [key, property] of Object.entries(value)) {
    const validator = validators[key];
    if (!validator) {
      throw new Error(`${label} contains unknown option "${key}".`);
    }
    if (!validator(property)) {
      throw new Error(`${label}.${key} has an invalid value.`);
    }
  }
}

export function validateCliConfig(value: unknown): CliConfig {
  if (!isPlainObject(value)) {
    throw new Error('Config must be an object.');
  }

  const rootKeys = Object.keys(value);
  const unknownRootKey = rootKeys.find(
    (key) => key !== 'defaults' && key !== 'games',
  );
  if (unknownRootKey) {
    throw new Error(`Config contains unknown property "${unknownRootKey}".`);
  }

  const defaultsValue = value.defaults ?? {};
  if (!isPlainObject(defaultsValue)) {
    throw new Error('Config.defaults must be an object.');
  }
  validateKnownProperties(defaultsValue, defaultValidators, 'Config.defaults');

  if (!Array.isArray(value.games) || value.games.length === 0) {
    throw new Error('Config.games must be a non-empty array.');
  }

  const games = value.games.map((entry, index): CliConfigGame => {
    if (isString(entry)) {
      return { url: entry };
    }
    if (!isPlainObject(entry)) {
      throw new Error(
        `Config.games[${index}] must be a URL string or an object.`,
      );
    }

    validateKnownProperties(entry, gameValidators, `Config.games[${index}]`);
    const hasUrl = isString(entry.url);
    const hasNameAndAuthor = isString(entry.name) && isString(entry.author);
    if (!hasUrl && !hasNameAndAuthor) {
      throw new Error(
        `Config.games[${index}] must provide "url" or both "name" and "author".`,
      );
    }

    return entry as CliConfigGame;
  });

  return {
    defaults: defaultsValue as CliConfigDefaults,
    games,
  };
}

export function loadCliConfig(configPath: string): CliConfig {
  const absolutePath = resolve(configPath);
  let contents: string;
  try {
    contents = readFileSync(absolutePath, 'utf8');
  } catch (error) {
    throw new Error(
      `Unable to read config file "${absolutePath}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const extension = extname(absolutePath).toLowerCase();
  let parsed: unknown;
  try {
    if (extension === '.json') {
      parsed = JSON.parse(contents);
    } else if (extension === '.yaml' || extension === '.yml') {
      parsed = parseYaml(contents);
    } else {
      throw new Error('expected a .json, .yaml, or .yml file');
    }
  } catch (error) {
    throw new Error(
      `Unable to parse config file "${absolutePath}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    return validateCliConfig(parsed);
  } catch (error) {
    throw new Error(
      `Invalid config file "${absolutePath}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
