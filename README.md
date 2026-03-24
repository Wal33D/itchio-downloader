# Itchio-Downloader

[![npm version](https://img.shields.io/npm/v/itchio-downloader.svg)](https://www.npmjs.com/package/itchio-downloader)
[![CI](https://github.com/Wal33D/itchio-downloader/actions/workflows/ci.yml/badge.svg)](https://github.com/Wal33D/itchio-downloader/actions/workflows/ci.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE.md)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

Download free games from [itch.io](https://itch.io) programmatically. No API key, no Puppeteer, no GUI — just HTTP.

```bash
npm install itchio-downloader
```

```javascript
const { downloadGame } = require('itchio-downloader');

const result = await downloadGame({
  itchGameUrl: 'https://baraklava.itch.io/manic-miners',
});
// → Downloads 1 GB game via direct HTTP, no browser needed
```

---

## Why This Exists

There's no official API for downloading free itch.io games. The itch desktop app requires a GUI. Butler requires developer access. This library gives you a simple function call or CLI command that just works.

**Tested on games from 2.6 MB to 1.9 GB.** 86 unit tests. Zero Puppeteer required for most downloads.

## Features

| Feature | Description |
|---------|-------------|
| **Direct HTTP** | Downloads free games via 4 HTTP requests — no browser binary |
| **HTML5 Web Games** | Scrape browser-only games for offline play (`--html5`) |
| **Platform Selection** | Choose Windows/Mac/Linux builds (`--platform`) |
| **API Key Support** | Optional authenticated downloads via itch.io API |
| **Batch & Concurrent** | Download multiple games with configurable concurrency |
| **Collections** | Fetch every game from a collection URL |
| **In-Memory** | Download to a `Buffer` instead of disk |
| **Progress Tracking** | Real-time `onProgress` callback |
| **Retries** | Exponential backoff on failure |
| **Rate Limiting** | Configurable delay between batch downloads |
| **Metadata** | Saves game metadata JSON alongside downloads |
| **Puppeteer Fallback** | Optional — only used if direct HTTP fails |

## How It Works

```
downloadGame(params)
  1. API key provided?  → Authenticated API download
  2. --html5 flag?      → Scrape web game assets
  3. Free game?         → Direct HTTP (CSRF → download page → CDN URL)
  4. Web-only game?     → Auto-detect and scrape HTML5 assets
  5. All else fails?    → Puppeteer fallback (if installed)
```

Most free games resolve at step 3. Puppeteer is an optional dependency — you don't need it unless steps 1–4 all fail.

## Install

```bash
# As a library
npm install itchio-downloader

# As a global CLI
npm install -g itchio-downloader

# With pnpm or yarn
pnpm add itchio-downloader
yarn add itchio-downloader
```

## CLI Usage

```bash
# Download by URL
itchio-downloader --url "https://baraklava.itch.io/manic-miners"

# Download by name and author
itchio-downloader --name "manic-miners" --author "baraklava" --downloadDirectory ./games

# Download an HTML5 web game for offline play
itchio-downloader --url "https://ncase.itch.io/wbwwb" --html5

# Choose a specific platform build
itchio-downloader --url "https://dev.itch.io/game" --platform linux

# Download an entire collection with rate limiting
itchio-downloader --collection "https://itch.io/c/123/my-collection" --concurrency 2 --delay 1000

# With API key and retries
itchio-downloader --url "https://dev.itch.io/game" --apiKey "your-key" --retries 3
```

See [docs/CLI.md](docs/CLI.md) for the full option reference.

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
const result = await downloadGame({
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

### Platform Selection

```javascript
await downloadGame({
  itchGameUrl: 'https://dev.itch.io/game',
  platform: 'linux', // 'windows', 'linux', or 'osx'
  apiKey: 'your-key',
});
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

### In-Memory Download

```javascript
const result = await downloadGame({
  itchGameUrl: 'https://baraklava.itch.io/manic-miners',
  apiKey: 'your-key',
  inMemory: true,
});
console.log(result.fileBuffer); // Buffer containing the file
```

### Batch Downloads

```javascript
// Sequential with rate limiting
await downloadGame(
  [
    { name: 'manic-miners', author: 'baraklava' },
    { itchGameUrl: 'https://dev.itch.io/game' },
  ],
  { concurrency: 2, delayBetweenMs: 1000 },
);
```

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
| `html5` | `boolean` | `false` | Download HTML5 web game assets |
| `platform` | `string` | — | Preferred platform: `'windows'`, `'linux'`, `'osx'` |
| `writeMetaData` | `boolean` | `true` | Save metadata JSON alongside download |
| `retries` | `number` | `0` | Retry attempts on failure |
| `retryDelayMs` | `number` | `500` | Base delay for exponential backoff (ms) |
| `navigationTimeoutMs` | `number` | `30000` | Puppeteer page navigation timeout (ms) |
| `fileWaitTimeoutMs` | `number` | `30000` | Download file detection timeout (ms) |
| `parallel` | `boolean` | `false` | Run all downloads concurrently |
| `onProgress` | `function` | — | `({ bytesReceived, totalBytes, fileName }) => void` |

## Response

```typescript
type DownloadGameResponse = {
  status: boolean;        // true if download succeeded
  message: string;        // human-readable result
  filePath?: string;      // path to downloaded file
  fileBuffer?: Buffer;    // file contents (inMemory mode)
  metadataPath?: string;  // path to metadata JSON
  metaData?: IItchRecord; // game metadata
  html5Assets?: string[]; // list of downloaded assets (html5 mode)
  httpStatus?: number;    // HTTP status code on failure
};
```

## Usage Policy

Only download free games and follow the [itch.io Terms of Service](https://itch.io/docs/general/terms). Don't bypass payment restrictions. This project isn't affiliated with or endorsed by itch.io.

## Development

```bash
git clone https://github.com/Wal33D/itchio-downloader.git
cd itchio-downloader
pnpm install
pnpm test        # 86 tests
pnpm run build   # compile TypeScript
pnpm run lint    # ESLint
```

## Documentation

- **[API Reference](docs/API-Reference.md)** — functions, types, and exports
- **[CLI Reference](docs/CLI.md)** — all command line options
- **[Advanced Usage](docs/Advanced-Usage.md)** — concurrency, HTML5, platform selection
- **[Installation](docs/Installation.md)** — setup requirements
- **[Debugging](docs/Debugging.md)** — troubleshooting tips
- **[Roadmap](docs/Roadmap.md)** — planned improvements
- **[Contributing](CONTRIBUTING.md)** — contribution guidelines
- **[Changelog](CHANGELOG.md)** — release history

## License

ISC
