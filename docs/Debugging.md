# Debugging

This page covers ways to diagnose issues when using **Itchio-Downloader**.
Ensure you are running **Node.js 18 or later** so that the built-in `fetch` API is available.

## Enable verbose logs

Set the environment variable `DEBUG_DOWNLOAD_GAME=true` before running your script or the CLI. When enabled, the library prints helpful messages about each step of the download process.

Example:

```bash
DEBUG_DOWNLOAD_GAME=true node myScript.js
# or
DEBUG_DOWNLOAD_GAME=true itchio-downloader --url "https://example.itch.io/game"
```

## Troubleshooting tips

- **Browser fails to launch** – Puppeteer requires a recent version of Chromium and certain system libraries. On Linux, install packages such as `libnss3`, `libatk-bridge2.0-0`, and `libxcb-dri3-0`. You can also try running with root privileges or passing additional flags if sandboxing issues occur.
- **Downloads time out or hang** – The downloader waits up to 30 seconds for the file to appear. Slow connections may need more time. Ensure your internet connection is stable and that itch.io is reachable. Re-run with debug logging enabled to see where the process stops.
- **Browser closes unexpectedly** – Make sure no other process is killing the spawned browser. On headless systems you can set `headless: false` in `initializeBrowser.ts` for interactive debugging.

If problems persist, open an issue on GitHub with the debug logs attached.
