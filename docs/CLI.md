# Command Line Reference

For installation instructions see [Installation](Installation.md).

The CLI allows you to download games directly from a terminal. It requires **Node.js 18 or later**.

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
| `--url`               | Full URL to the game on itch.io                                          |
| `--collection`        | URL to a collection on itch.io                                           |
| `--name`              | Name of the game to download (used with `--author`)                      |
| `--author`            | Username of the game's author                                            |
| `--apiKey`            | itch.io API key for authenticated downloads (defaults to `ITCH_API_KEY`) |
| `--downloadDirectory` | Directory where the file should be saved                                 |
| `--memory`            | Store the downloaded file in memory                                      |
| `--concurrency`       | Max simultaneous downloads when using a list                             |
| `-h, --help`          | Display usage information                                                |

You must provide either a collection URL, a game URL, or both a name and author.

You can set the API key in an `.env` file or environment variable `ITCH_API_KEY`
so the `--apiKey` flag is optional.

### Examples

```bash
# Using a URL
itchio-downloader --url "https://baraklava.itch.io/manic-miners"

# Using name and author
itchio-downloader --name "manic miners" --author "baraklava"

# Limiting concurrent downloads when using a list
itchio-downloader --url "https://baraklava.itch.io/manic-miners" --concurrency 2

# Downloading all games from a collection
itchio-downloader --collection "https://itch.io/c/123/example"
```

If you have the package installed locally without `-g`, run the examples with `npx itchio-downloader` or `pnpm dlx itchio-downloader`.

During downloads the CLI prints a progress percentage in the terminal so you can
track how many bytes have been received.
