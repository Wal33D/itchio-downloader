# Command Line Reference

The CLI allows you to download games directly from a terminal.

Build the executable before running:

```bash
npm run build-cli
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
| `--downloadDirectory` | Directory where the file should be saved            |
| `-h, --help`          | Display usage information                           |

You must provide either a URL or both a name and author.

### Examples

```bash
# Using a URL
itchio-downloader --url "https://baraklava.itch.io/manic-miners"

# Using name and author
itchio-downloader --name "manic miners" --author "baraklava"
```
