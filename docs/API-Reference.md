# API Reference

Itchio-Downloader exports three main functions along with related TypeScript types. Import them from the package root.
The library requires **Node.js 18+** for the native `fetch` API:

```javascript
const { downloadGame, downloadGameDirect, downloadGameHtml5 } = require('itchio-downloader');
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

### Parameters

Accepts the same `DownloadGameParams` object. The most relevant fields are `itchGameUrl` (or `name`/`author`), `downloadDirectory`, `desiredFileName`, `inMemory`, `writeMetaData`, and `onProgress`.

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
```

See [Advanced Usage](Advanced-Usage.md) for concurrency, HTML5, platform, and custom path examples.
For troubleshooting and debug logs, see the [Debugging](Debugging.md) guide.
