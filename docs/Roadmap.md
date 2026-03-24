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
- **Cookie caching** -- Session cookies and CSRF tokens are cached per domain with a 30-minute TTL. Subsequent downloads skip the CSRF negotiation step. Configurable via `--noCookieCache` and `--cookieCacheDir`.
- **Resume support** -- Interrupted downloads can be resumed using HTTP Range headers. Partial data is saved to `.part` files. Enable with `--resume`.
- **Checksum verification** -- Downloaded file sizes are verified against Content-Length headers. Responses include `sizeVerified`, `bytesDownloaded`, and `resumed` fields. In-memory downloads throw on size mismatch. HTML5 asset downloads verify each individual asset.
- **137 unit tests** -- Comprehensive test coverage for all download paths, cookie caching, resume logic, and size verification.

## Planned

### Configuration File Support

Add the ability for the CLI to read a JSON or YAML file containing a list of games and default options:

1. Implement a `--config` option that accepts the path to the file.
2. Parse each entry and merge it with any CLI flags provided.
3. Validate the structure of the file before initiating downloads.

This feature will simplify batch operations and allow sharing predefined lists of games.

### CLI Enhancements

- Add a `--dry-run` mode that shows what would be downloaded without actually downloading.
- Support `--output-format json` for machine-readable output.
