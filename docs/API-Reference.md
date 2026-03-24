# API Reference

Itchio-Downloader exports download functions, cookie cache utilities, and a resumable download helper. Import them from the package root.
The library requires **Node.js 18+** for the native `fetch` API:

```javascript
const {
  downloadGame,
  downloadGameDirect,
  downloadGameHtml5,
  downloadWithResume,
  getCachedCookies,
  setCachedCookies,
  clearCachedCookies,
} = require('itchio-downloader');
```

---

## downloadGame(params, concurrency?)

Downloads one or more games from itch.io. Automatically selects the best download method using a priority chain (API key, HTML5, direct HTTP, auto-detect HTML5, Puppeteer fallback). When an array of parameter objects is supplied, multiple games can be fetched sequentially or in parallel.

### Parameters

- `params` -- Either a single `DownloadGameParams` object or an array of them. Each object accepts:
  - `name` _(string, optional)_ -- Game name, used with `author`.
  - `author` _(string, optional)_ -- Author's username on itch.io.
  - `itchGameUrl` _(string, optional)_ -- Direct URL to the game's page.
  - `desiredFileName` _(string, optional)_ -- Rename the downloaded file. Must not contain path separators.
  - `downloadDirectory` _(string, optional)_ -- Directory for the downloaded files. Defaults to `~/downloads`.
  - `apiKey` _(string, optional)_ -- itch.io API key for authenticated downloads.
    If omitted, the library checks the `ITCH_API_KEY` environment variable.
  - `inMemory` _(boolean, optional)_ -- Store the downloaded file in memory and return it as a Buffer. When a `downloadDirectory` is provided the file is also written to disk.
  - `writeMetaData` _(boolean, optional)_ -- Write a metadata JSON file alongside the download. Defaults to `true`.
  - `html5` _(boolean, optional)_ -- Download HTML5 web game assets for offline play. When set, the library scrapes the game's embedded iframe and downloads all referenced assets (HTML, JS, CSS, images, audio, etc.) with directory structure preserved.
  - `platform` _(string, optional)_ -- Preferred platform for multi-upload games. Accepted values: `'windows'`, `'linux'`, `'osx'`.
  - `retries` _(number, optional)_ -- Number of retry attempts on failure. Defaults to `0`.
  - `retryDelayMs` _(number, optional)_ -- Base delay in milliseconds for exponential backoff. Defaults to `500`.
  - `navigationTimeoutMs` _(number, optional)_ -- Puppeteer page navigation timeout in milliseconds. Defaults to `30000`.
  - `fileWaitTimeoutMs` _(number, optional)_ -- Download file detection timeout in milliseconds. Defaults to `30000`.
  - `parallel` _(boolean, optional)_ -- When used inside an array, run this download concurrently via `Promise.all`.
  - `resume` _(boolean, optional)_ -- Resume interrupted downloads using HTTP Range headers. Partial data is saved to a `.part` file and the download continues from where it left off. Defaults to `false`.
  - `noCookieCache` _(boolean, optional)_ -- Disable automatic cookie caching. By default, session cookies and CSRF tokens are cached per domain with a 30-minute TTL to speed up subsequent downloads.
  - `cookieCacheDir` _(string, optional)_ -- Directory for the cookie cache file. Defaults to a subdirectory in the system temp directory.
  - `onProgress` _(function, optional)_ -- Receives `{ bytesReceived, totalBytes, fileName }` as the download proceeds.
- `concurrency` _(number, optional)_ -- When `params` is an array and `parallel` is not set, limits how many downloads happen at once. Defaults to `1`.

### Returns

A promise that resolves to `DownloadGameResponse` or an array of responses.

---

## downloadGameDirect(params)

Downloads a free itch.io game using direct HTTP requests -- no Puppeteer, no API key. This is the method used internally by `downloadGame` as the primary no-auth path.

**Flow:**

1. GET the game page to extract CSRF token, upload IDs, cookies, and price info.
2. POST to `/download_url` to get a signed download page URL.
3. GET the download page to get fresh CSRF and upload IDs.
4. POST to `/file/{uploadId}` to get a Cloudflare R2 CDN URL (60-second TTL).
5. Stream the CDN URL to disk or memory.

Session cookies and CSRF tokens are cached automatically (30-minute TTL) so subsequent downloads to the same domain skip step 1. When `resume: true` is set, interrupted downloads are saved as `.part` files and resumed using Range headers.

### Parameters

Accepts the same `DownloadGameParams` object. The most relevant fields are `itchGameUrl` (or `name`/`author`), `downloadDirectory`, `desiredFileName`, `inMemory`, `writeMetaData`, `resume`, `noCookieCache`, `cookieCacheDir`, and `onProgress`.

### Returns

A `Promise<DownloadGameResponse>`.

---

## downloadGameHtml5(params)

Downloads an HTML5 web game from itch.io for offline play. Scrapes the embedded iframe URL (`itch.zone/html/{id}/index.html`), downloads `index.html` and all referenced assets, and saves them locally with directory structure preserved. JavaScript files are also scanned for additional asset references (images, audio, data files).

### Parameters

Accepts the same `DownloadGameParams` object. Set `html5: true` when calling via `downloadGame`, or call this function directly. The most relevant fields are `itchGameUrl` (or `name`/`author`), `downloadDirectory`, `writeMetaData`, and `onProgress`.

### Returns

A `Promise<DownloadGameResponse>`. On success, the response includes:
- `html5Assets` -- array of downloaded asset file paths relative to the game directory.
- `filePath` -- path to the saved `index.html`.

---

## downloadWithResume(url, filePath, headers?, onProgress?)

Download a file with automatic resume support. If a `.part` file exists from a previous interrupted download, sends a `Range` header to resume from where it left off. On success, renames `.part` to the final path.

### Parameters

- `url` _(string)_ -- URL to download.
- `filePath` _(string)_ -- Final file path. Partial data is stored at `filePath + '.part'`.
- `headers` _(Record<string, string>, optional)_ -- Additional headers (e.g., User-Agent, Authorization).
- `onProgress` _(function, optional)_ -- Progress callback.

### Returns

A `Promise<StreamResult>`:

```typescript
interface StreamResult {
  bytesWritten: number;
  expectedBytes?: number;
  verified: boolean;    // true if Content-Length matched actual bytes
  resumed?: boolean;    // true if download was resumed from partial
}
```

---

## Cookie Cache Functions

### getCachedCookies(url, cacheDir?)

Returns cached cookies for a URL's domain, or `null` if expired (30-min TTL) or missing.

### setCachedCookies(url, cookies, csrfToken?, cacheDir?)

Saves cookies and an optional CSRF token for a URL's domain.

### clearCachedCookies(url?, cacheDir?)

Clears cached cookies for a specific domain, or all cached cookies if no URL is provided.

---

## Types

```typescript
type DownloadGameParams = {
  name?: string;
  author?: string;
  desiredFileName?: string;
  downloadDirectory?: string;
  apiKey?: string;
  itchGameUrl?: string;
  inMemory?: boolean;
  writeMetaData?: boolean;
  retries?: number;
  retryDelayMs?: number;
  navigationTimeoutMs?: number;
  fileWaitTimeoutMs?: number;
  parallel?: boolean;
  html5?: boolean;
  platform?: string;
  resume?: boolean;
  cookieCacheDir?: string;
  noCookieCache?: boolean;
  onProgress?: (info: DownloadProgress) => void;
};

type DownloadGameResponse = {
  status: boolean;
  message: string;
  httpStatus?: number;
  metaData?: IItchRecord;
  metadataPath?: string;
  filePath?: string;
  fileBuffer?: Buffer;
  html5Assets?: string[];
  sizeVerified?: boolean;
  bytesDownloaded?: number;
  resumed?: boolean;
};

interface DownloadProgress {
  bytesReceived: number;
  totalBytes?: number;
  fileName?: string;
}

interface IItchRecord {
  title?: string;
  coverImage?: string;
  authors?: { url: string; name: string }[];
  tags?: string[];
  id?: number;
  commentsLink?: string;
  selfLink?: string;
  author?: string;
  name?: string;
  domain?: string;
  itchGameUrl?: string;
  itchMetaDataUrl?: string;
}
```

The `metaData` object mirrors the information fetched from the game's `data.json` file.

## Examples

```javascript
// Standard download (auto-selects best method)
await downloadGame({
  itchGameUrl: 'https://baraklava.itch.io/manic-miners',
  desiredFileName: 'manic-miners-latest',
});

// Direct HTTP download (no Puppeteer, no API key)
const result = await downloadGameDirect({
  itchGameUrl: 'https://vfqd.itch.io/terra-nil',
  downloadDirectory: './games',
});

// HTML5 web game download
const html5Result = await downloadGameHtml5({
  itchGameUrl: 'https://ncase.itch.io/wbwwb',
  downloadDirectory: './games',
});
console.log(html5Result.html5Assets);

// Platform-specific download
await downloadGame({
  itchGameUrl: 'https://dev.itch.io/game',
  apiKey: 'your-key',
  platform: 'linux',
});

// Resumable download with size verification
const resumeResult = await downloadGame({
  itchGameUrl: 'https://dev.itch.io/large-game',
  resume: true,
});
console.log(resumeResult.resumed);       // true if continued from .part
console.log(resumeResult.sizeVerified);  // true if size matched
console.log(resumeResult.bytesDownloaded);

// Cookie cache management
const { getCachedCookies, clearCachedCookies } = require('itchio-downloader');
const cached = await getCachedCookies('https://dev.itch.io/game');
await clearCachedCookies(); // clear all
```

See [Advanced Usage](Advanced-Usage.md) for concurrency, HTML5, platform, and custom path examples.
For troubleshooting and debug logs, see the [Debugging](Debugging.md) guide.
