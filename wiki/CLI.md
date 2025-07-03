# Command Line Reference

Build the CLI with `npm run build-cli` and run it using `itchio-downloader [options]`.

## Options

| Flag | Description |
|------|-------------|
| `--url` | Full URL to the game on itch.io |
| `--name` | Name of the game to download (used with `--author`) |
| `--author` | Username of the game's author |
| `--downloadDirectory` | Directory where the file should be saved |
| `-h, --help` | Display usage information |

Provide either a URL or both a name and author.

Example:

```bash
itchio-downloader --url "https://baraklava.itch.io/manic-miners"
```
