# Advanced Usage

This page covers more complex scenarios for `downloadGame`. These examples show how to control concurrency, run downloads in parallel, download HTML5 web games, select platforms, and save files to custom locations. For installation instructions see the [README](../README.md).

## Direct HTTP downloads (no Puppeteer needed)

Most free games on itch.io can be downloaded without Puppeteer or an API key. The library handles this automatically by extracting CSRF tokens from the game page and negotiating a signed CDN URL via direct HTTP requests.

This is the default behavior -- just call `downloadGame` and it works:

```javascript
const { downloadGame } = require('itchio-downloader');

const result = await downloadGame({
  itchGameUrl: 'https://vfqd.itch.io/terra-nil',
  downloadDirectory: './games',
});
// No API key, no Puppeteer -- downloaded via direct HTTP
```

When does Puppeteer get used? Only as a last resort, and only if it is installed. The download priority chain is:

1. API key (if provided)
2. Explicit `html5: true` flag
3. Direct HTTP (CSRF + CDN)
4. Auto-detect HTML5 (if direct HTTP finds no downloadable uploads)
5. Puppeteer fallback (only if installed)

You can also call `downloadGameDirect` directly if you want to skip the priority chain:

```javascript
const { downloadGameDirect } = require('itchio-downloader');

const result = await downloadGameDirect({
  itchGameUrl: 'https://vfqd.itch.io/terra-nil',
  downloadDirectory: './games',
});
```

## HTML5 web game downloads

Some itch.io games are browser-only -- they run in an embedded iframe and have no downloadable files. The `html5` option scrapes all assets from the game's iframe (HTML, JavaScript, CSS, images, audio, data files) and saves them locally for offline play.

```javascript
const result = await downloadGame({
  itchGameUrl: 'https://ncase.itch.io/wbwwb',
  html5: true,
  downloadDirectory: './games',
});

console.log(result.html5Assets);
// ['game.js', 'style.css', 'sprites/player.png', 'audio/bgm.ogg', ...]
console.log(result.filePath);
// './games/wbwwb/index.html' -- open this in a browser to play offline
```

The library also scans JavaScript files for additional asset references (images, audio, JSON data, WASM modules, etc.) to ensure a complete offline copy.

If you don't set `html5: true` explicitly, the library will auto-detect web-only games when direct HTTP download fails and automatically fall back to HTML5 asset scraping.

From the CLI:

```bash
itchio-downloader --url "https://ncase.itch.io/wbwwb" --html5
itchio-downloader --url "https://ncase.itch.io/wbwwb" --html5 --downloadDirectory ./web-games
```

## Platform selection

When a game provides builds for multiple platforms, use the `platform` option to download a specific one:

```javascript
await downloadGame({
  itchGameUrl: 'https://dev.itch.io/game',
  apiKey: 'your-key',
  platform: 'linux',
});
```

Accepted values are `'windows'`, `'linux'`, and `'osx'`. This is most useful with API key downloads where the API returns a list of uploads with platform tags.

From the CLI:

```bash
itchio-downloader --url "https://dev.itch.io/game" --apiKey "your-key" --platform linux
```

## Controlled concurrency

Pass an array of game parameters along with a numeric `concurrency` value. Only that many downloads will run at once:

```javascript
const games = [
  { itchGameUrl: 'https://example.itch.io/game-one' },
  { itchGameUrl: 'https://example.itch.io/game-two' },
  { itchGameUrl: 'https://example.itch.io/game-three' },
];

await downloadGame(games, 2); // at most two downloads at a time
```

## Using `parallel: true`

Set `parallel: true` on individual items to run every download concurrently via `Promise.all`:

```javascript
await downloadGame([
  { itchGameUrl: 'https://example.itch.io/game-one', parallel: true },
  { itchGameUrl: 'https://example.itch.io/game-two', parallel: true },
  { itchGameUrl: 'https://example.itch.io/game-three', parallel: true },
]);
```

## Custom file paths

Specify `downloadDirectory` and `desiredFileName` to control where each file is saved and what it is called:

```javascript
await downloadGame({
  itchGameUrl: 'https://example.itch.io/game',
  downloadDirectory: '/path/to/games',
  desiredFileName: 'my-game.zip',
});
```

## Resuming interrupted downloads

For large downloads, enable resume support so interrupted transfers can continue from where they left off. Partial data is stored in a `.part` file alongside the target path:

```javascript
const result = await downloadGame({
  itchGameUrl: 'https://example.itch.io/large-game',
  resume: true,
});

console.log(result.resumed);        // true if continued from partial
console.log(result.sizeVerified);   // true if final size matches Content-Length
console.log(result.bytesDownloaded); // total bytes written
```

From the CLI:

```bash
itchio-downloader --url "https://example.itch.io/large-game" --resume
```

The library uses HTTP Range headers to resume. If the server doesn't support Range requests, the download starts from scratch automatically. The `.part` file is renamed to the final name on success.

## Cookie caching

Session cookies and CSRF tokens are cached automatically per domain (30-minute TTL). This speeds up subsequent downloads to the same itch.io author by skipping the CSRF negotiation step.

Cookie caching is enabled by default. To disable it:

```javascript
await downloadGame({
  itchGameUrl: 'https://example.itch.io/game',
  noCookieCache: true,
});
```

To customize where cookies are stored:

```javascript
await downloadGame({
  itchGameUrl: 'https://example.itch.io/game',
  cookieCacheDir: '/path/to/cache',
});
```

You can also manage the cookie cache programmatically:

```javascript
const { getCachedCookies, setCachedCookies, clearCachedCookies } = require('itchio-downloader');

// Check for cached session
const cached = await getCachedCookies('https://author.itch.io/game');
if (cached) {
  console.log('Cookies:', cached.cookies);
  console.log('CSRF:', cached.csrfToken);
}

// Clear all cached cookies
await clearCachedCookies();

// Clear for a specific domain
await clearCachedCookies('https://author.itch.io/game');
```

From the CLI:

```bash
# Disable cookie caching
itchio-downloader --url "https://example.itch.io/game" --noCookieCache

# Custom cache directory
itchio-downloader --url "https://example.itch.io/game" --cookieCacheDir /tmp/my-cache
```

## Size verification

All download paths verify the downloaded file size against the `Content-Length` header when available. The response includes a `sizeVerified` field:

```javascript
const result = await downloadGame({
  itchGameUrl: 'https://example.itch.io/game',
});

if (result.sizeVerified === false) {
  console.warn('Download size mismatch — file may be corrupted');
}
```

For in-memory downloads (`inMemory: true`), a size mismatch throws an error immediately. For HTML5 game downloads, individual assets with mismatched sizes are skipped and reported in the failure count.

## Progress callback

Provide an `onProgress` function to receive byte counts during a download:

```javascript
await downloadGame({
  itchGameUrl: 'https://example.itch.io/game',
  onProgress: ({ bytesReceived, totalBytes }) => {
    if (totalBytes) {
      const pct = ((bytesReceived / totalBytes) * 100).toFixed(1);
      console.log(`Progress: ${pct}%`);
    }
  },
});
```
