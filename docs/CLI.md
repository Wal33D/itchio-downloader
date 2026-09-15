# Command Line Reference

For installation instructions see [Installation](Installation.md).

The CLI allows you to download games directly from a terminal. It requires **Node.js 20.19+, 22.12+, or a newer supported release**.

If you installed the package globally you can run `itchio-downloader` immediately.
When working from a clone of the repository, build the executable first:

```bash
pnpm run build-cli
# or
yarn build-cli
```

Then invoke the command:

```bash
itchio-downloader [options]
```

## Options

| Flag                  | Description                                                              |
| --------------------- | ------------------------------------------------------------------------ |
| `--config`            | JSON or YAML file containing a game list and shared defaults             |
| `--url`               | Full URL to the game on itch.io                                          |
| `--collection`        | URL to a collection on itch.io                                           |
| `--jam`               | URL to a game jam — downloads all entries                                |
| `--name`              | Name of the game to download (used with `--author`)                      |
| `--author`            | Username of the game's author                                            |
| `--apiKey`            | itch.io API key for authenticated downloads (defaults to `ITCH_API_KEY`) |
| `--downloadDirectory` | Directory where the file should be saved                                 |
| `--memory`            | Store the downloaded file in memory                                      |
| `--html5`             | Download HTML5 web game assets for offline play                          |
| `--platform`          | Preferred platform: `windows`, `linux`, or `osx`                         |
| `--retries`           | Number of retry attempts on failure (default: `0`)                       |
| `--retryDelay`        | Base delay in ms for exponential backoff (default: `500`)                |
| `--concurrency`       | Max simultaneous downloads when using a list                             |
| `--delay`             | Delay in ms between batch downloads for rate limiting (default: `0`)     |
| `--resume`            | Resume interrupted downloads using HTTP Range headers                    |
| `--noCookieCache`     | Disable automatic cookie caching                                         |
| `--cookieCacheDir`    | Directory for cookie cache (default: system tmpdir)                      |
| `-h, --help`          | Display usage information                                                |
| `--version`           | Display the installed package version                                    |

You must provide a config file, collection URL, jam URL, game URL, or both a
name and author. `--config` cannot be combined with the collection, jam, URL,
name, or author target flags.

You can set the API key in an `.env` file or environment variable `ITCH_API_KEY`
so the `--apiKey` flag is optional.

> **Note:** Most free games download without Puppeteer or an API key. The library
> uses direct HTTP by default. Puppeteer is a separately installed fallback for
> Node.js 22.12+ and is only considered after all other methods fail.

### Examples

```bash
# Using a URL
itchio-downloader --url "https://baraklava.itch.io/manic-miners"

# Using name and author
itchio-downloader --name "manic miners" --author "baraklava"

# Limiting concurrent downloads when using a list
itchio-downloader --url "https://baraklava.itch.io/manic-miners" --concurrency 2

# Download all entries from a game jam
itchio-downloader --jam "https://itch.io/jam/gmtk-2023" --concurrency 3

# Downloading all games from a collection
itchio-downloader --collection "https://itch.io/c/123/example"

# HTML5 web-only games are auto-detected
itchio-downloader --url "https://ncase.itch.io/wbwwb"

# Or select HTML5 mode immediately
itchio-downloader --url "https://ncase.itch.io/wbwwb" --html5

# Download a specific platform build
itchio-downloader --url "https://dev.itch.io/game" --apiKey "your-key" --platform linux

# Combine HTML5 with a custom directory
itchio-downloader --url "https://example.itch.io/browser-game" --html5 --downloadDirectory ./web-games

# Retry on failure with backoff
itchio-downloader --url "https://dev.itch.io/game" --retries 3 --retryDelay 1000

# Resume an interrupted large download
itchio-downloader --url "https://dev.itch.io/large-game" --resume

# Download without cookie caching
itchio-downloader --url "https://dev.itch.io/game" --noCookieCache

# Custom cookie cache directory
itchio-downloader --url "https://dev.itch.io/game" --cookieCacheDir /tmp/my-cache
```

## Batch configuration files

Use `--config` with a `.json`, `.yaml`, or `.yml` file to download a reusable
list of games. Each entry can be a game URL string or an object containing
`url`, or both `name` and `author`.

```yaml
defaults:
  downloadDirectory: ./games
  concurrency: 2
  delay: 500
  retries: 2
  resume: true

games:
  - https://baraklava.itch.io/manic-miners
  - name: Terra Nil
    author: vfqd
  - url: https://ncase.itch.io/wbwwb
    html5: true
```

The equivalent JSON shape is:

```json
{
  "defaults": {
    "downloadDirectory": "./games",
    "concurrency": 2,
    "delay": 500
  },
  "games": [
    "https://baraklava.itch.io/manic-miners",
    { "name": "Terra Nil", "author": "vfqd" }
  ]
}
```

Supported shared and per-game options are `apiKey`, `downloadDirectory`,
`memory`, `html5`, `platform`, `retries`, `retryDelay`, `resume`,
`noCookieCache`, and `cookieCacheDir`. `concurrency` and `delay` are shared batch
defaults only. Unknown options, invalid types, unsupported platforms, invalid
numeric ranges, incomplete name/author pairs, and empty game lists are rejected
before any download starts.

Options explicitly supplied on the command line override the corresponding
defaults and per-game values for every entry. For example:

```bash
itchio-downloader --config ./games.yaml --downloadDirectory ./other-games --concurrency 3
```

Relative paths are resolved from the current working directory. Prefer the
`ITCH_API_KEY` environment variable over storing credentials in a shared config
file.

If you have the package installed locally without `-g`, run the examples with `npx itchio-downloader` or `pnpm dlx itchio-downloader`.

During downloads the CLI prints a progress bar in the terminal with percentage,
bytes received, and total size when available.
