import { downloadGame } from './downloadGame';
import {
  DownloadGameParams,
  DownloadGameResponse,
  DownloadProgress,
} from './types';

function parseCollectionId(url: string): string {
  const match = url.match(/\/c\/(\d+)/);
  if (!match) throw new Error('Invalid collection url');
  return match[1];
}

async function fetchGameUrls(
  collectionId: string,
  apiKey?: string,
): Promise<string[]> {
  const urls: string[] = [];
  let page = 1;
  while (true) {
    const reqUrl = new URL(
      `https://api.itch.io/collections/${collectionId}/collection-games`,
    );
    reqUrl.searchParams.set('page', String(page));
    if (apiKey) reqUrl.searchParams.set('api_key', apiKey);
    const res = await fetch(reqUrl.toString());
    if (!res.ok) {
      const err: any = new Error(
        `Failed to fetch collection page ${page}: ${res.status}`,
      );
      err.statusCode = res.status;
      throw err;
    }
    const data = await res.json();
    if (Array.isArray(data.games)) {
      for (const g of data.games) {
        if (g && g.url) urls.push(g.url);
      }
    }
    const nextRaw = data.next_page ?? data.next_page_url;
    if (nextRaw === undefined || nextRaw === null) {
      break;
    }
    const next = Number(nextRaw);
    page = Number.isFinite(next) ? next : page + 1;
  }
  return urls;
}

export interface DownloadCollectionOptions {
  downloadDirectory?: string;
  concurrency?: number;
  onProgress?: (info: DownloadProgress) => void;
}

export async function downloadCollection(
  collectionUrl: string,
  apiKey?: string,
  opts: DownloadCollectionOptions = {},
): Promise<DownloadGameResponse | DownloadGameResponse[]> {
  const key = apiKey || process.env.ITCH_API_KEY;
  const id = parseCollectionId(collectionUrl);
  const gameUrls = await fetchGameUrls(id, key);
  const params: DownloadGameParams[] = gameUrls.map((u) => {
    const p: DownloadGameParams = { itchGameUrl: u };
    if (opts.downloadDirectory) p.downloadDirectory = opts.downloadDirectory;
    if (opts.onProgress) p.onProgress = opts.onProgress;
    if (key) p.apiKey = key;
    return p;
  });
  return downloadGame(params, opts.concurrency ?? 1);
}
