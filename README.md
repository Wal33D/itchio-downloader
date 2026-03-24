<div align="center">

# itchio-downloader

**Download free games from [itch.io](https://itch.io) programmatically.**\
No API key. No Puppeteer. No GUI. Just HTTP.

[![npm version](https://img.shields.io/npm/v/itchio-downloader.svg?style=flat-square&color=cb3837)](https://www.npmjs.com/package/itchio-downloader)
[![CI](https://img.shields.io/github/actions/workflow/status/Wal33D/itchio-downloader/ci.yml?style=flat-square&label=tests)](https://github.com/Wal33D/itchio-downloader/actions/workflows/ci.yml)
[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg?style=flat-square)](LICENSE.md)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A518-brightgreen.svg?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg?style=flat-square)](https://www.typescriptlang.org/)

</div>

---

```bash
npm install itchio-downloader
```

```javascript
const { downloadGame } = require('itchio-downloader');

const result = await downloadGame({
  itchGameUrl: 'https://baraklava.itch.io/manic-miners',
});
// Downloads a 1 GB game via direct HTTP — no browser needed
```

## Why This Exists

There's no official API for downloading free itch.io games. The itch desktop app requires a GUI. Butler requires developer access. This library gives you a single function call or CLI command that just works.

**Tested on games from 2.6 MB to 1.9 GB.** 161 unit tests. Strict TypeScript. Zero lint warnings.

---

## Features

<table>
<tr><td width="180"><strong>Direct HTTP</strong></td><td>Downloads free games via 4 HTTP requests — no browser binary needed</td></tr>
<tr><td><strong>HTML5 Web Games</strong></td><td>Scrape browser-only games for offline play with <code>--html5</code></td></tr>
<tr><td><strong>Resume Downloads</strong></td><td>Resume interrupted downloads using HTTP Range headers with <code>--resume</code></td></tr>
<tr><td><strong>Cookie Caching</strong></td><td>Reuse session cookies across downloads (30-min TTL) — faster batch downloads</td></tr>
<tr><td><strong>Size Verification</strong></td><td>Validate Content-Length matches actual bytes downloaded on every path</td></tr>
<tr><td><strong>Platform Selection</strong></td><td>Choose Windows, Mac, or Linux builds with <code>--platform</code></td></tr>
<tr><td><strong>API Key Support</strong></td><td>Optional authenticated downloads via itch.io API</td></tr>
<tr><td><strong>Batch & Concurrent</strong></td><td>Download multiple games with configurable concurrency and rate limiting</td></tr>
<tr><td><strong>Collections</strong></td><td>Fetch every game from a collection URL in one command</td></tr>
<tr><td><strong>Game Jams</strong></td><td>Download all entries from a game jam with <code>--jam</code></td></tr>
<tr><td><strong>In-Memory</strong></td><td>Download to a <code>Buffer</code> instead of disk</td></tr>
<tr><td><strong>Progress Tracking</strong></td><td>Real-time progress bar in CLI, <code>onProgress</code> callback in library</td></tr>
<tr><td><strong>Retries</strong></td><td>Exponential backoff on failure</td></tr>
<tr><td><strong>Metadata</strong></td><td>Saves game metadata JSON alongside downloads</td></tr>
<tr><td><strong>Puppeteer Fallback</strong></td><td>Optional last-resort fallback — only if direct HTTP fails</td></tr>
</table>

---

## How It Works

```
downloadGame(params)
  1. API key provided?  --> Authenticated API download
  2. --html5 flag?      --> Scrape web game assets
  3. Free game?         --> Direct HTTP (CSRF --> download page --> CDN URL)
  4. Web-only game?     --> Auto-detect and scrape HTML5 assets
  5. All else fails?    --> Puppeteer fallback (if installed)
```

Most free games resolve at **step 3**. Puppeteer is an optional dependency — you don't need it unless steps 1-4 all fail.

---

## Install

```bash
# As a library
npm install itchio-downloader

# As a global CLI
npm install -g itchio-downloader

# With pnpm or yarn
pnpm add itchio-downloader
yarn add itchio-downloader

# Arch Linux (AUR) — https://aur.archlinux.org/packages/itchio-downloader
yay -S itchio-downloader
```

---

## CLI

```bash
# Download by URL
itchio-downloader --url "https://baraklava.itch.io/manic-miners"

# Download by name + author
itchio-downloader --name "manic-miners" --author "baraklava" --downloadDirectory ./games

# HTML5 web game for offline play
itchio-downloader --url "https://ncase.itch.io/wbwwb" --html5

# Choose a platform build
itchio-downloader --url "https://dev.itch.io/game" --platform linux

# Resume an interrupted download
itchio-downloader --url "https://dev.itch.io/large-game" --resume

# Download all entries from a game jam
itchio-downloader --jam "https://itch.io/jam/gmtk-2023" --concurrency 3

# Download a collection with rate limiting
itchio-downloader --collection "https://itch.io/c/123/my-collection" --concurrency 2 --delay 1000

# With API key and retries
itchio-downloader --url "https://dev.itch.io/game" --apiKey "your-key" --retries 3

# Disable cookie caching
itchio-downloader --url "https://dev.itch.io/game" --noCookieCache
```

> See **[docs/CLI.md](docs/CLI.md)** for the full option reference.

---

## Library Usage

### Basic Download

```javascript
const { downloadGame } = require('itchio-downloader');

// By URL — no API key needed
const result = await downloadGame({
  itchGameUrl: 'https://vfqd.itch.io/terra-nil',
  downloadDirectory: './games',
});
console.log(result.filePath); // './games/Terra Nil 0.41 Windows.zip'

// By name and author
const result2 = await downloadGame({
  name: 'manic-miners',
  author: 'baraklava',
});
```

### HTML5 Web Games

Download browser-only games (game jams, HTML5 embeds) with all assets for offline play:

```javascript
const result = await downloadGame({
  itchGameUrl: 'https://ncase.itch.io/wbwwb',
  html5: true,
  downloadDirectory: './games',
});

console.log(result.html5Assets);
// ['css/game.css', 'js/lib/pixi.min.js', 'sprites/bg.png', ...]
// Open ./games/wbwwb/index.html to play offline
```

### Game Jams

Download all entries from an itch.io game jam:

```javascript
const { downloadJam } = require('itchio-downloader');

const results = await downloadJam(
  'https://itch.io/jam/gmtk-2023',
  null,
  { concurrency: 3, downloadDirectory: './jam-games' },
);
```

### Resume Interrupted Downloads

Large downloads can be resumed if interrupted. Partial data is saved to a `.part` file and continues from where it left off:

```javascript
const result = await downloadGame({
  itchGameUrl: 'https://baraklava.itch.io/manic-miners',
  resume: true,
});

console.log(result.resumed);        // true if continued from partial
console.log(result.sizeVerified);   // true if Content-Length matched
console.log(result.bytesDownloaded); // total bytes written
```

### Cookie Caching

Session cookies are cached automatically (30-min TTL) so subsequent downloads skip CSRF negotiation:

```javascript
// Disable caching or customize the directory
await downloadGame({
  itchGameUrl: 'https://dev.itch.io/game',
  noCookieCache: true,
  cookieCacheDir: '/tmp/cache',
});

// Manage the cache programmatically
const { getCachedCookies, clearCachedCookies } = require('itchio-downloader');
const cached = await getCachedCookies('https://dev.itch.io/game');
await clearCachedCookies(); // clear all
```

### Progress Tracking

```javascript
await downloadGame({
  itchGameUrl: 'https://baraklava.itch.io/manic-miners',
  onProgress: ({ bytesReceived, totalBytes, fileName }) => {
    if (totalBytes) {
      const pct = ((bytesReceived / totalBytes) * 100).toFixed(1);
      console.log(`${fileName}: ${pct}%`);
    }
  },
});
```

### More Examples

<details>
<summary><strong>Platform Selection</strong></summary>

```javascript
await downloadGame({
  itchGameUrl: 'https://dev.itch.io/game',
  platform: 'linux', // 'windows', 'linux', or 'osx'
  apiKey: 'your-key',
});
```
</details>

<details>
<summary><strong>In-Memory Download</strong></summary>

```javascript
const result = await downloadGame({
  itchGameUrl: 'https://baraklava.itch.io/manic-miners',
  apiKey: 'your-key',
  inMemory: true,
});
console.log(result.fileBuffer); // Buffer containing the file
```
</details>

<details>
<summary><strong>Batch Downloads</strong></summary>

```javascript
await downloadGame(
  [
    { name: 'manic-miners', author: 'baraklava' },
    { itchGameUrl: 'https://dev.itch.io/game' },
  ],
  { concurrency: 2, delayBetweenMs: 1000 },
);
```
</details>

---

## Configuration

| Parameter | Type | Default | Description |
|:----------|:-----|:--------|:------------|
| `itchGameUrl` | `string` | -- | Direct URL to the game |
| `name` | `string` | -- | Game name (use with `author`) |
| `author` | `string` | -- | Author's username |
| `apiKey` | `string` | `ITCH_API_KEY` env | API key for authenticated downloads |
| `downloadDirectory` | `string` | `~/downloads` | Where to save files |
| `desiredFileName` | `string` | -- | Custom file name (no path separators) |
| `inMemory` | `boolean` | `false` | Download to Buffer instead of disk |
| `html5` | `boolean` | `false` | Download HTML5 web game assets |
| `platform` | `string` | -- | Preferred platform: `windows`, `linux`, `osx` |
| `resume` | `boolean` | `false` | Resume interrupted downloads (Range headers) |
| `noCookieCache` | `boolean` | `false` | Disable automatic cookie caching |
| `cookieCacheDir` | `string` | system tmpdir | Directory for the cookie cache |
| `writeMetaData` | `boolean` | `true` | Save metadata JSON alongside download |
| `retries` | `number` | `0` | Retry attempts on failure |
| `retryDelayMs` | `number` | `500` | Base delay for exponential backoff (ms) |
| `parallel` | `boolean` | `false` | Run all downloads concurrently |
| `onProgress` | `function` | -- | `({ bytesReceived, totalBytes, fileName }) => void` |

---

## Response

```typescript
type DownloadGameResponse = {
  status: boolean;          // true if download succeeded
  message: string;          // human-readable result
  filePath?: string;        // path to downloaded file
  fileBuffer?: Buffer;      // file contents (inMemory mode)
  metadataPath?: string;    // path to metadata JSON
  metaData?: IItchRecord;   // game metadata object
  html5Assets?: string[];   // downloaded asset paths (html5 mode)
  httpStatus?: number;      // HTTP status code on failure
  sizeVerified?: boolean;   // true if Content-Length matched actual bytes
  bytesDownloaded?: number; // total bytes downloaded
  resumed?: boolean;        // true if download was resumed from .part file
};
```

---

## Development

```bash
git clone https://github.com/Wal33D/itchio-downloader.git
cd itchio-downloader
pnpm install
pnpm test        # 161 tests
pnpm run build   # compile TypeScript
pnpm run lint    # ESLint (zero warnings)
```

## Documentation

| | |
|:--|:--|
| **[API Reference](docs/API-Reference.md)** | Functions, types, and exports |
| **[CLI Reference](docs/CLI.md)** | All command-line options |
| **[Advanced Usage](docs/Advanced-Usage.md)** | Resume, cookies, concurrency, HTML5 |
| **[Installation](docs/Installation.md)** | Setup requirements |
| **[Debugging](docs/Debugging.md)** | Troubleshooting tips |
| **[Roadmap](docs/Roadmap.md)** | Planned improvements |
| **[Changelog](CHANGELOG.md)** | Release history |
| **[Contributing](CONTRIBUTING.md)** | Contribution guidelines |

## Usage Policy

Only download free games and follow the [itch.io Terms of Service](https://itch.io/docs/general/terms). Don't bypass payment restrictions. This project isn't affiliated with or endorsed by itch.io.

---

<div align="center">

**[npm](https://www.npmjs.com/package/itchio-downloader)** &middot; **[GitHub](https://github.com/Wal33D/itchio-downloader)** &middot; **[Issues](https://github.com/Wal33D/itchio-downloader/issues)**

ISC License

</div>
