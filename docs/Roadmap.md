# Roadmap

This page tracks planned improvements for **Itchio-Downloader**. Items may change as the project evolves.

## Completed

These features have been implemented and are available in the current release:

- **Direct HTTP downloads (no Puppeteer)** -- Free games are downloaded via direct HTTP using CSRF token extraction and CDN URL negotiation. No headless browser needed for most games.
- **Puppeteer is optional** -- Puppeteer is a separately installed, last-resort fallback on Node.js 22.12+. Core direct, API, and HTML5 downloads do not install or require it.
- **HTML5 web game downloads** -- Browser-only games are auto-detected, while `--html5` selects that path immediately. The library saves the embedded game and discovered HTML, JavaScript, CSS, image, audio, and data references with their directory structure preserved.
- **Platform selection** -- Use `--platform` (or the `platform` parameter) to choose a specific platform build (windows, linux, osx) for multi-upload games.
- **Retry with exponential backoff** -- Configurable `retries` and `retryDelayMs` for automatic retry on failure.
- **HTTP status codes in errors** -- Error responses include `httpStatus` when available.
- **CLI concurrency flag** -- `--concurrency` controls parallel download limits.
- **CLI progress bar** -- Real-time progress display with percentage, bytes, and file name.
- **Cookie caching** -- Session cookies and CSRF tokens are cached per domain with a 30-minute TTL so subsequent downloads can reuse the same session. Configurable via `--noCookieCache` and `--cookieCacheDir`.
- **Resume support** -- Interrupted downloads can be resumed using HTTP Range headers. Partial data is saved to `.part` files. Enable with `--resume`.
- **Size verification** -- Downloaded file sizes are verified against Content-Length headers. Responses include `sizeVerified`, `bytesDownloaded`, and `resumed` fields. In-memory downloads throw on size mismatch. HTML5 asset downloads verify each individual asset.
- **Game jam downloads** -- Download all entries from an itch.io game jam with `--jam`. Extracts jam ID from the jam page, fetches entries from the `entries.json` endpoint, and downloads each game through the existing pipeline.
- **178 automated tests** -- Coverage for download paths, cookie caching, resume logic, size verification, optional browser loading, and game jams.

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
