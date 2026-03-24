# Itchio-Downloader

[![npm version](https://img.shields.io/npm/v/itchio-downloader.svg)](https://www.npmjs.com/package/itchio-downloader)
[![CI](https://github.com/Wal33D/itchio-downloader/actions/workflows/ci.yml/badge.svg)](https://github.com/Wal33D/itchio-downloader/actions/workflows/ci.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE.md)

A small CLI and Node.js library for downloading free games from [itch.io](https://itch.io). Fetch games by URL or by name and author — no API key or GUI required.

**[API Reference](docs/API-Reference.md)** · **[CLI Docs](docs/CLI.md)** · **[Advanced Usage](docs/Advanced-Usage.md)** · **[Changelog](CHANGELOG.md)**

## Features

- **No Puppeteer Required** — downloads free games via direct HTTP (Puppeteer is optional fallback)
- **HTML5 Web Games** — download browser-only games for offline play with `--html5`
- **Platform Selection** — choose Windows/Mac/Linux build with `--platform`
- **Direct Downloads** — by URL or name + author, no desktop GUI or Butler needed
- **API Key Support** — optional itch.io API key for authenticated downloads
- **Batch & Concurrent** — download multiple games with configurable concurrency
- **Collection Downloads** — fetch every game from a collection URL
- **In-Memory Mode** — download to a Buffer instead of disk
- **Progress Tracking** — `onProgress` callback for real-time download status
- **Retries** — automatic retry with exponential backoff on failure
- **Configurable Timeouts** — separate timeouts for navigation and file detection
- **Metadata** — saves game metadata JSON alongside downloads

## Quick Start

Requires **Node.js 18+**.

```bash
pnpm add itchio-downloader
# or globally for the CLI
pnpm add -g itchio-downloader
```

## Usage

```javascript
const { downloadGame } = require('itchio-downloader');

// Downloads without Puppeteer or API key — just works
const result = await downloadGame({
  itchGameUrl: 'https://vfqd.itch.io/terra-nil',
  downloadDirectory: './games',
});

// By name and author
const result = await downloadGame({
  name: 'manic-miners',
  author: 'baraklava',
  downloadDirectory: './downloads',
});

// With API key and retries
const result = await downloadGame({
  itchGameUrl: 'https://baraklava.itch.io/manic-miners',
  apiKey: 'your-itch-api-key',
  retries: 3,
  retryDelayMs: 1000,
});
```

### HTML5 Web Games

```javascript
// Download HTML5 web game for offline play
const result = await downloadGame({
  itchGameUrl: 'https://ncase.itch.io/wbwwb',
  html5: true,
  downloadDirectory: './games',
});
console.log(result.html5Assets); // ['game.js', 'sprites/bg.png', ...]
```

### Platform Selection

```javascript
await downloadGame({
  itchGameUrl: 'https://dev.itch.io/game',
  apiKey: 'your-key',
  platform: 'linux',
});
```

### In-Memory & Progress Tracking

```javascript
// In-memory download
const result = await downloadGame({
  itchGameUrl: 'https://baraklava.itch.io/manic-miners',
  apiKey: 'your-key',
  inMemory: true,
});
console.log(result.fileBuffer); // Buffer

// With progress tracking
await downloadGame({
  itchGameUrl: 'https://baraklava.itch.io/manic-miners',
  onProgress: ({ bytesReceived, totalBytes, fileName }) => {
    if (totalBytes) {
      console.log(`${fileName}: ${((bytesReceived / totalBytes) * 100).toFixed(1)}%`);
    }
  },
});
```

### Batch Downloads

```javascript
await downloadGame([
  { name: 'manic-miners', author: 'baraklava' },
  { itchGameUrl: 'https://dev.itch.io/game' },
], 2); // concurrency limit
```

## CLI

```bash
itchio-downloader --url "https://baraklava.itch.io/manic-miners"
itchio-downloader --name "manic-miners" --author "baraklava" --downloadDirectory ./games
itchio-downloader --collection "https://itch.io/c/123/my-collection" --concurrency 3
itchio-downloader --url "https://dev.itch.io/game" --apiKey "your-key" --retries 3
itchio-downloader --url "https://dev.itch.io/game" --memory  # in-memory mode
itchio-downloader --url "https://ncase.itch.io/wbwwb" --html5  # HTML5 web game
itchio-downloader --url "https://dev.itch.io/game" --platform linux  # specific platform
```

See [docs/CLI.md](docs/CLI.md) for all options.

## Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `itchGameUrl` | `string` | — | Direct URL to the game |
| `name` | `string` | — | Game name (use with `author`) |
| `author` | `string` | — | Author's username |
| `apiKey` | `string` | `ITCH_API_KEY` env | API key for authenticated downloads |
| `downloadDirectory` | `string` | `~/downloads` | Where to save files |
| `desiredFileName` | `string` | — | Custom file name (no path separators) |
| `inMemory` | `boolean` | `false` | Download to Buffer instead of disk |
| `html5` | `boolean` | `false` | Download HTML5 web game assets for offline play |
| `platform` | `string` | — | Preferred platform: `'windows'`, `'linux'`, `'osx'` |
| `writeMetaData` | `boolean` | `true` | Save metadata JSON alongside download |
| `retries` | `number` | `0` | Retry attempts on failure |
| `retryDelayMs` | `number` | `500` | Base delay for exponential backoff (ms) |
| `navigationTimeoutMs` | `number` | `30000` | Puppeteer page navigation timeout (ms) |
| `fileWaitTimeoutMs` | `number` | `30000` | Download file detection timeout (ms) |
| `parallel` | `boolean` | `false` | Run all downloads concurrently |
| `onProgress` | `function` | — | Progress callback `({ bytesReceived, totalBytes, fileName })` |

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
```

## How It Works

The library uses a priority chain to download games, trying each method in order until one succeeds:

1. **API key** — If an API key is provided (or set via `ITCH_API_KEY`), use the authenticated itch.io API for the most reliable download.
2. **`--html5` flag** — If explicitly requested, scrape the embedded web game iframe and download all assets (HTML, JS, images, audio) for offline play.
3. **Direct HTTP** — For free games without an API key: fetch the game page, extract CSRF tokens and upload IDs, negotiate a signed CDN URL, and stream the file. No browser required.
4. **Auto-detect HTML5** — If the direct download fails because the game has no downloadable uploads (web-only), automatically attempt an HTML5 asset scrape.
5. **Puppeteer fallback** — Only if Puppeteer is installed and all methods above have failed, launch a headless browser to trigger the download.

> **Note:** Puppeteer is now an optional dependency. Most free games download without it.

## Usage Policy

Only download free games and follow the [itch.io Terms of Service](https://itch.io/docs/general/terms). Don't bypass payment restrictions. This project isn't affiliated with or endorsed by itch.io.

## Development

```bash
git clone https://github.com/Wal33D/itchio-downloader.git
cd itchio-downloader
pnpm install
pnpm test        # 86 tests
pnpm run build   # compile TypeScript
pnpm run lint    # ESLint check
```

## Documentation

- [API Reference](docs/API-Reference.md) — full function and type docs
- [CLI Reference](docs/CLI.md) — all command line options
- [Advanced Usage](docs/Advanced-Usage.md) — concurrency, custom paths, progress
- [Installation](docs/Installation.md) — setup requirements
- [Debugging](docs/Debugging.md) — troubleshooting and verbose logging
- [Roadmap](docs/Roadmap.md) — planned improvements
- [Contributing](CONTRIBUTING.md) — contribution guidelines
- [Changelog](CHANGELOG.md) — release history

## License

ISC
