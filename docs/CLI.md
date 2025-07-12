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

| Flag                  | Description                                         |
| --------------------- | --------------------------------------------------- |
| `--url`               | Full URL to the game on itch.io                     |
| `--name`              | Name of the game to download (used with `--author`) |
| `--author`            | Username of the game's author                       |
| `--apiKey`            | itch.io API key for authenticated downloads         |
| `--downloadDirectory` | Directory where the file should be saved            |
| `--concurrency`       | Max simultaneous downloads when using a list        |
| `-h, --help`          | Display usage information                           |

You must provide either a URL or both a name and author.

### Examples

```bash
# Using a URL
itchio-downloader --url "https://baraklava.itch.io/manic-miners"

# Using name and author
itchio-downloader --name "manic miners" --author "baraklava"

# Limiting concurrent downloads when using a list
itchio-downloader --url "https://baraklava.itch.io/manic-miners" --concurrency 2
```

If you have the package installed locally without `-g`, run the examples with `npx itchio-downloader` or `pnpm dlx itchio-downloader`.

During downloads the CLI prints a progress percentage in the terminal so you can
track how many bytes have been received.
