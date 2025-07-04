# Roadmap

This page tracks planned improvements for **Itchio-Downloader**. Items may change as the project evolves.

## Reusable Cookies

Switching to a reusable cookie will reduce the overhead of launching Puppeteer for every download. The basic idea is:

1. **Capture cookies** from the first Puppeteer session using `page.cookies()` and write them to `cookies.json`.
2. **Reuse cookies** by loading the file and sending them in a `cookie` header when downloading via `fetch`.
3. **Refresh periodically**. If a download fails or the cookies are older than a set threshold, open Puppeteer again to generate a new `cookies.json`.
4. Provide a small helper (CLI command or script) for manually updating the cookie file when needed.

This approach allows most downloads to run without opening a headless browser while still remaining compatible with itch.io's authentication.

