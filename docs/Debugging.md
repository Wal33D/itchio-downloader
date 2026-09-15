# Debugging

This page covers ways to diagnose issues when using **Itchio-Downloader**.
Ensure you are running **Node.js 20.19+, 22.12+, or a newer supported release**.

## Enable verbose logs

Set the environment variable `DEBUG_DOWNLOAD_GAME=true` before running your script or the CLI. When enabled, the library prints helpful messages about each step of the download process.

Example:

```bash
DEBUG_DOWNLOAD_GAME=true node myScript.js
# or
DEBUG_DOWNLOAD_GAME=true itchio-downloader --url "https://example.itch.io/game"
```

## Troubleshooting tips

- **Browser fallback is unavailable** – Puppeteer is not installed by default and its secure supported release requires Node.js 22.12+. Install it with `npm install puppeteer@^25.11.0`. AUR users need `yay -S puppeteer chromium`. The downloader detects `/usr/bin/chromium`, or you can set `PUPPETEER_EXECUTABLE_PATH` explicitly.
- **HTML5 game has no download button** – Browser-only games are auto-detected. Use `--html5` to select web-game downloading immediately, especially when a page also offers desktop uploads.
- **Game page returns 403 or 404** – Verify the URL in a normal browser. The page may be private, restricted, unpublished, or removed; the downloader cannot bypass those controls.
- **Downloads time out or hang** – The downloader waits up to 30 seconds for the file to appear. Slow connections may need more time. Ensure your internet connection is stable and that itch.io is reachable. Re-run with debug logging enabled to see where the process stops.
- **Browser closes unexpectedly** – Make sure no other process is killing the spawned browser. Contributors debugging the fallback can set `headless: false` in `initializeBrowser.ts` for an interactive run.

If problems persist, open an issue on GitHub with the debug logs attached.
