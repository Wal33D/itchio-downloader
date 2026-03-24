# Roadmap

This page tracks planned improvements for **Itchio-Downloader**. Items may change as the project evolves.

## Completed

These features have been implemented and are available in the current release:

- **Direct HTTP downloads (no Puppeteer)** -- Free games are downloaded via direct HTTP using CSRF token extraction and CDN URL negotiation. No headless browser needed for most games.
- **Puppeteer is optional** -- Puppeteer is now an optional dependency. The library only uses it as a last-resort fallback if all other download methods fail and Puppeteer is installed.
- **HTML5 web game downloads** -- Browser-only games can be downloaded for offline play with `--html5`. The library scrapes the embedded iframe and downloads all assets (HTML, JS, CSS, images, audio, data files) with directory structure preserved. JavaScript files are scanned for additional asset references.
- **Platform selection** -- Use `--platform` (or the `platform` parameter) to choose a specific platform build (windows, linux, osx) for multi-upload games.
- **Retry with exponential backoff** -- Configurable `retries` and `retryDelayMs` for automatic retry on failure.
- **File deduplication** -- Existing files are automatically renamed with a numeric suffix to avoid overwrites.
- **HTTP status codes in errors** -- Error responses include `httpStatus` when available.
- **CLI concurrency flag** -- `--concurrency` controls parallel download limits.
- **CLI progress bar** -- Real-time progress display with percentage, bytes, and file name.

## Planned

### Reusable Cookies

Switching to a reusable cookie will reduce the overhead of launching Puppeteer for the rare cases where it is still needed. The basic idea is:

1. **Capture cookies** from the first Puppeteer session using `page.cookies()` and write them to `cookies.json`.
2. **Reuse cookies** by loading the file and sending them in a `cookie` header when downloading via `fetch`.
3. **Refresh periodically**. If a download fails or the cookies are older than a set threshold, open Puppeteer again to generate a new `cookies.json`.
4. Provide a small helper (CLI command or script) for manually updating the cookie file when needed.

### Configuration File Support

Add the ability for the CLI to read a JSON or YAML file containing a list of games and default options:

1. Implement a `--config` option that accepts the path to the file.
2. Parse each entry and merge it with any CLI flags provided.
3. Validate the structure of the file before initiating downloads.

This feature will simplify batch operations and allow sharing predefined lists of games.

### CLI Enhancements

- Provide a `--update-cookies` command to regenerate the cookie file on demand.
- Add a `--dry-run` mode that shows what would be downloaded without actually downloading.
- Support `--output-format json` for machine-readable output.

### Testing Improvements

- Expand unit tests for the CLI and concurrency logic.
- Add integration tests using a local server to simulate downloads.
- Add tests for HTML5 asset scraping and direct HTTP download paths.
