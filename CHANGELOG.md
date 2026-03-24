# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-03-23

### Added

- **Direct HTTP downloads** — download free games with 4 HTTP requests, no Puppeteer needed
- **HTML5 web game downloads** — scrape and save browser-only games for offline play (`--html5` flag)
- **Platform selection** — choose Windows/Mac/Linux build with `--platform` flag
- **Rate limiting** — `--delay` flag for ms between batch downloads
- **Shared streaming utility** (`httpDownload.ts`) — `streamToFile()`, `streamToBuffer()`
- **New exports** — `downloadGameDirect`, `downloadGameHtml5`, `DownloadGameOptions`
- 25 new tests (81 total) covering direct HTTP, HTML5, streaming, and fallback chain

### Changed

- **Puppeteer is now optional** — moved to `optionalDependencies`, dynamically imported
- **New download priority chain**: API → HTML5 flag → Direct HTTP → auto-detect HTML5 → Puppeteer
- `downloadGame()` accepts `DownloadGameOptions` object (backward compatible with number)
- `ItchApiClient` refactored to use shared `httpDownload` helpers
- Complete documentation rewrite — README, API-Reference, CLI, Advanced-Usage, Roadmap

## [0.9.0] - 2026-03-23

### Security

- **API key moved from URL query params to Authorization Bearer header** — prevents exposure in logs, browser history, and referrer headers
- Path traversal guard on `desiredFileName` — rejects paths containing `/` or `\`

### Fixed

- **Browser race condition** — replaced global singleton with per-download browser instances; concurrent downloads no longer share or fight over a single browser
- **CDP compatibility** — updated from deprecated `Browser.enable`/`Browser.downloadWillBegin` to `Page.download*` events (Chrome 120+ compatible)
- **File rename race condition** — removed dangerous 2-second delay + unlink after rename; `fs.rename` is already atomic
- **Memory mode crash** — guarded path operations that ran `path.basename('')` when downloading to buffer only
- **Empty catch blocks** — all silently swallowed errors now documented or properly handled
- Flaky `waitForFile` tests stabilized

### Added

- `navigationTimeoutMs` param — configurable timeout for Puppeteer page navigation (default: 30s)
- `fileWaitTimeoutMs` param — configurable timeout for download file detection (default: 30s)
- 14 new edge case tests (42 → 56 total): path traversal, retry mechanism, API client auth, URL parsing, file rename edge cases
- New `itchApiClient.test.ts` test file

### Changed

- **ESLint rules re-enabled** — `no-explicit-any`, `no-unused-vars`, `prefer-const`, `no-empty`, `no-constant-condition` all enforced in source (relaxed in tests)
- All 100 lint violations fixed across 21 source files — `any` replaced with `unknown` and proper types throughout
- Updated Chrome user agent string to v141
- Process cleanup handlers only register once (prevents duplicate registration)

## [0.7.8] - 2025-07-04

### Added

- Comprehensive documentation overhaul
- New `docs/CLI.md` with command line reference
- Expanded example README and contribution guidelines

## [0.7.7] - 2025-07-03

### Added

- Jest tests for file utilities and `downloadGame`
- ESLint and Prettier configuration
- Parallel download flag and typed CLI arguments

### Changed

- Consistently use `downloadDirectory`
- Updated documentation with usage policy and disclaimers

## [0.7.5] - 2024-05-28

### Changed

- Removed `userDataDir` management and set download directory directly
- General refactoring and cleanup

## [0.0.23] - 2024-05-05

### Added

- `node-fetch` dependency

### Changed

- Improved download logic and project cleanup

## [0.0.14] - 2024-05-04

### Changed

- Documentation improvements and minor adjustments

## [0.0.13] - 2024-05-04

### Added

- Further README updates and configuration tweaks

## [0.0.11] - 2024-05-03

### Changed

- Updated configuration and documentation

## [0.0.1] - 2024-05-03

### Added

- Initial release
