import fsp from 'fs/promises';
import path from 'path';
import os from 'os';

interface CookieEntry {
  cookies: string;
  csrfToken?: string;
  savedAt: number;
}

interface CookieStore {
  [domain: string]: CookieEntry;
}

const DEFAULT_CACHE_DIR = path.join(os.tmpdir(), 'itchio-downloader');
const CACHE_FILE = 'cookie-cache.json';
/** Cookies expire after 30 minutes (itch.io sessions are short-lived) */
const MAX_AGE_MS = 30 * 60 * 1000;

function getCachePath(cacheDir?: string): string {
  return path.join(cacheDir || DEFAULT_CACHE_DIR, CACHE_FILE);
}

/**
 * Load the cookie store from disk. Returns empty store if file doesn't exist.
 */
async function loadStore(cacheDir?: string): Promise<CookieStore> {
  const cachePath = getCachePath(cacheDir);
  try {
    const raw = await fsp.readFile(cachePath, 'utf-8');
    return JSON.parse(raw) as CookieStore;
  } catch {
    return {};
  }
}

/**
 * Save the cookie store to disk, creating the directory if needed.
 */
async function saveStore(store: CookieStore, cacheDir?: string): Promise<void> {
  const cachePath = getCachePath(cacheDir);
  await fsp.mkdir(path.dirname(cachePath), { recursive: true });
  await fsp.writeFile(cachePath, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Extract domain key from a URL (e.g., "author.itch.io").
 */
function domainKey(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Get cached cookies for a URL's domain. Returns null if expired or missing.
 */
export async function getCachedCookies(
  url: string,
  cacheDir?: string,
): Promise<{ cookies: string; csrfToken?: string } | null> {
  const store = await loadStore(cacheDir);
  const key = domainKey(url);
  const entry = store[key];
  if (!entry) return null;
  if (Date.now() - entry.savedAt > MAX_AGE_MS) {
    // Expired — remove and return null
    delete store[key];
    await saveStore(store, cacheDir).catch(() => {});
    return null;
  }
  return { cookies: entry.cookies, csrfToken: entry.csrfToken };
}

/**
 * Save cookies for a URL's domain.
 */
export async function setCachedCookies(
  url: string,
  cookies: string,
  csrfToken?: string,
  cacheDir?: string,
): Promise<void> {
  const store = await loadStore(cacheDir);
  store[domainKey(url)] = { cookies, csrfToken, savedAt: Date.now() };
  await saveStore(store, cacheDir);
}

/**
 * Clear all cached cookies, or just for a specific URL's domain.
 */
export async function clearCachedCookies(url?: string, cacheDir?: string): Promise<void> {
  if (!url) {
    const cachePath = getCachePath(cacheDir);
    await fsp.unlink(cachePath).catch(() => {});
    return;
  }
  const store = await loadStore(cacheDir);
  delete store[domainKey(url)];
  await saveStore(store, cacheDir);
}

/**
 * Merge new Set-Cookie headers into an existing cookie string.
 * Later values for the same cookie name override earlier ones.
 */
export function mergeCookies(existing: string, newCookies: string): string {
  const map = new Map<string, string>();
  for (const part of existing.split('; ').filter(Boolean)) {
    const [name] = part.split('=', 1);
    map.set(name, part);
  }
  for (const part of newCookies.split('; ').filter(Boolean)) {
    const [name] = part.split('=', 1);
    map.set(name, part);
  }
  return [...map.values()].join('; ');
}
