# Roadmap

This page tracks planned improvements for **Itchio-Downloader**. Items may change as the project evolves.

## Reusable Cookies

Switching to a reusable cookie will reduce the overhead of launching Puppeteer for every download. The basic idea is:

1. **Capture cookies** from the first Puppeteer session using `page.cookies()` and write them to `cookies.json`.
2. **Reuse cookies** by loading the file and sending them in a `cookie` header when downloading via `fetch`.
3. **Refresh periodically**. If a download fails or the cookies are older than a set threshold, open Puppeteer again to generate a new `cookies.json`.
4. Provide a small helper (CLI command or script) for manually updating the cookie file when needed.

This approach allows most downloads to run without opening a headless browser while still remaining compatible with itch.io's authentication.


## Configuration File Support

Add the ability for the CLI to read a JSON or YAML file containing a list of games and default options. The steps involve:

1. Implement a `--config` option that accepts the path to the file.
2. Parse each entry and merge it with any CLI flags provided.
3. Validate the structure of the file before initiating downloads.

This feature will simplify batch operations and allow sharing predefined lists of games.

## CLI Enhancements

- Expose a `--concurrency` flag matching the library function.
- Display basic progress output for each download.
- Provide a `--update-cookies` command to regenerate the cookie file on demand.

## Robust Error Handling

- Retry failed downloads a few times with exponential backoff.
- Detect existing files and automatically skip or rename them.
- Include HTTP status codes and additional context in error messages.

## Testing Improvements

- Expand unit tests for the CLI and concurrency logic.
- Add integration tests using a local server to simulate downloads.
