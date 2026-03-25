import { downloadGame } from './downloadGame';
import { fetchWithTimeout, USER_AGENT } from './httpDownload';
import {
  DownloadGameParams,
  DownloadGameResponse,
  DownloadProgress,
} from './types';

/**
 * Extract the jam slug from a jam URL.
 * Accepts: https://itch.io/jam/gmtk-2023, itch.io/jam/ludum-dare-55, etc.
 */
function parseJamSlug(url: string): string {
  const match = url.match(/itch\.io\/jam\/([\w-]+)/);
  if (!match) throw new Error('Invalid jam URL: expected itch.io/jam/{slug}');
  return match[1];
}

/**
 * Fetch the numeric jam ID from the jam's HTML page.
 * The page contains a JS init call: I.ViewJam('#view_jam_...', {"id":12345,...})
 */
async function fetchJamId(slug: string): Promise<number> {
  const res = await fetchWithTimeout(`https://itch.io/jam/${slug}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Jam page returned HTTP ${res.status}`);
  }
  const html = await res.text();
  const match = html.match(/ViewJam[^{]*\{[^}]*"id"\s*:\s*(\d+)/);
  if (!match) {
    throw new Error('Could not extract jam ID from page');
  }
  return Number(match[1]);
}

interface JamEntry {
  game: {
    url: string;
    title: string;
    platforms?: string[];
  };
}

/**
 * Fetch all game entries from a jam using the entries.json endpoint.
 * Returns an array of game URLs.
 */
async function fetchJamEntries(jamId: number): Promise<string[]> {
  const res = await fetchWithTimeout(
    `https://itch.io/jam/${jamId}/entries.json`,
    { headers: { 'User-Agent': USER_AGENT } },
  );
  if (!res.ok) {
    throw new Error(`Jam entries endpoint returned HTTP ${res.status}`);
  }
  const data = (await res.json()) as { jam_games?: JamEntry[] };
  if (!Array.isArray(data.jam_games)) {
    return [];
  }
  return data.jam_games
    .filter((entry) => entry.game?.url)
    .map((entry) => entry.game.url);
}

export interface DownloadJamOptions {
  downloadDirectory?: string;
  concurrency?: number;
  onProgress?: (info: DownloadProgress) => void;
  /** Enable resume support for interrupted downloads */
  resume?: boolean;
  /** Disable cookie caching */
  noCookieCache?: boolean;
  /** Custom cookie cache directory */
  cookieCacheDir?: string;
}

/**
 * Download all games from an itch.io game jam.
 *
 * Accepts a jam URL like `https://itch.io/jam/gmtk-2023` and downloads
 * every submitted game. Each jam entry is a regular itch.io game page,
 * so all existing download methods (direct HTTP, HTML5, API key) work.
 *
 * @param jamUrl - URL to the jam page (e.g., https://itch.io/jam/gmtk-2023)
 * @param apiKey - Optional itch.io API key
 * @param opts - Download options (concurrency, directory, resume, etc.)
 */
export async function downloadJam(
  jamUrl: string,
  apiKey?: string,
  opts: DownloadJamOptions = {},
): Promise<DownloadGameResponse | DownloadGameResponse[]> {
  const key = apiKey || process.env.ITCH_API_KEY;
  const slug = parseJamSlug(jamUrl);
  const jamId = await fetchJamId(slug);
  const gameUrls = await fetchJamEntries(jamId);

  if (gameUrls.length === 0) {
    return { status: false, message: 'No game entries found in jam.' };
  }

  const params: DownloadGameParams[] = gameUrls.map((u) => {
    const p: DownloadGameParams = { itchGameUrl: u };
    if (opts.downloadDirectory) p.downloadDirectory = opts.downloadDirectory;
    if (opts.onProgress) p.onProgress = opts.onProgress;
    if (key) p.apiKey = key;
    if (opts.resume) p.resume = true;
    if (opts.noCookieCache) p.noCookieCache = true;
    if (opts.cookieCacheDir) p.cookieCacheDir = opts.cookieCacheDir;
    return p;
  });
  return downloadGame(params, opts.concurrency ?? 1);
}
