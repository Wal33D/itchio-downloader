# Itchio-Downloader

**GitHub Repository:** [itchio-downloader on GitHub](https://github.com/Wal33D/itchio-downloader)

**npm Package:** [itchio-downloader on npm](https://www.npmjs.com/package/itchio-downloader)

Itchio-Downloader provides a small CLI and library for downloading free games from [itch.io](https://itch.io). Games can be fetched by URL or by name and author—no API key or GUI is required.
See the [API Reference](docs/API-Reference.md) for all functions and types. More guides are available in [docs/README.md](docs/README.md).

## Table of Contents

1. [Motivation](#motivation)
2. [Features](#features)
3. [Usage Policy](#usage-policy)
4. [Quick Start](#quick-start)
5. [Usage](#usage)
6. [Command Line Usage](#command-line-usage)
7. [Configuration Options](#configuration-options)
8. [Types](#types)
9. [Example Output](#example-output)
10. [Documentation](#documentation)
11. [Contributing](#contributing)
12. [Release Procedure](#release-procedure)
13. [Maintenance](#maintenance)
14. [License](#license)

## Motivation

I built this tool to create a launcher for free games and released it so others can do the same. It's the only known way to download itch.io games programmatically without an API key or developer access.

## Features

- **Direct Downloads**: Get games by URL or by name and author—no desktop GUI or Butler.
- **Batch Operations**: Download multiple games in one run.
- **Collection Downloads**: Fetch every game from a collection URL.
- **Customization**: Rename files and choose download directories.
- **Simplicity**: Only a URL or author and title is required.
- **API Key Optional**: Use an itch.io API key for authenticated downloads.

## Usage Policy

Only download free games and follow the [itch.io Terms of Service](https://itch.io/docs/general/terms). Don't bypass payment restrictions. This project isn't affiliated with or endorsed by itch.io.

## Quick Start

Requires **Node.js 18+**. For a full setup guide see [docs/Installation.md](docs/Installation.md).

Install the package:

```bash
pnpm add itchio-downloader
# or install globally for the CLI
pnpm add -g itchio-downloader
# or
yarn add itchio-downloader
```

If installed globally you can run the command directly:

```bash
itchio-downloader --help
```

See [docs/CLI.md](docs/CLI.md) for CLI options and [docs/Debugging.md](docs/Debugging.md) for verbose logging.

## Usage

### Importing the package

```javascript
const { downloadGame } = require('itchio-downloader');
```

### Downloading a Single Game

Download a game by URL or by name and author:

```javascript
// Using a direct URL:
await downloadGame({ itchGameUrl: 'https://baraklava.itch.io/manic-miners' });

// Using name and author and optional params:
await downloadGame({
  name: 'manic-miners',
  author: 'baraklava',
  downloadDirectory: 'full file path', // Optional
});
```

### Downloading Multiple Games

Provide an array to download multiple games. Mix URLs or name/author combinations. Use `concurrency` to limit downloads or set `parallel: true` to run them all concurrently:

```javascript
async function downloadMultipleGames() {
  const gameParams = [
    { name: 'manic-miners', author: 'baraklava' },
    { itchGameUrl: 'https://anotherdev.itch.io/another-game' },
    { itchGameUrl: 'https://moregames.itch.io/better-game', parallel: true },
  ];

  await downloadGame(gameParams, 2); // up to 2 downloads or set parallel to run all at once
}
downloadMultipleGames();
```

See [docs/Advanced-Usage.md](docs/Advanced-Usage.md) for more concurrency and custom path examples.

### Tracking Progress

Provide an `onProgress` callback to monitor download progress:

```javascript
await downloadGame({
  itchGameUrl: 'https://baraklava.itch.io/manic-miners',
  onProgress: ({ bytesReceived, totalBytes }) => {
    if (totalBytes) {
      const pct = ((bytesReceived / totalBytes) * 100).toFixed(1);
      console.log(`Progress: ${pct}%`);
    }
  },
});
```

The CLI displays similar progress automatically when run directly.

## Command Line Usage

Build the CLI with `pnpm run build-cli`, then run `itchio-downloader` with your options. The `--concurrency` flag limits how many downloads run at once when supplying a list of games. Full details are in [docs/CLI.md](docs/CLI.md).

```bash
# Example limiting concurrency
itchio-downloader --url "https://baraklava.itch.io/manic-miners" --concurrency 2

# Download an entire collection
itchio-downloader --collection "https://itch.io/c/123/example"
```

## Configuration Options

The `downloadGame` function accepts the following parameters within `DownloadGameParams`:

- `name`: Game name (use with `author`).
- `author`: Author's username.
- `itchGameUrl`: Direct URL to the game.
- `desiredFileName`: Custom file name.
- `downloadDirectory`: Where to save files.
- `apiKey`: itch.io API key for authenticated downloads. If omitted, the library
  reads `ITCH_API_KEY` from the environment (load a `.env` file if needed).
- `writeMetaData`: Save metadata JSON (default `true`).
- `concurrency`: Number of downloads at once when using an array.
- `parallel`: If true, run all downloads concurrently with `Promise.all`.
- `onProgress`: Callback invoked with download progress information.

## Types

```javascript
export type DownloadGameParams = {
   name?: string,
   author?: string,
   desiredFileName?: string,
   downloadDirectory?: string,
   apiKey?: string,
   itchGameUrl?: string,
   writeMetaData?: boolean,
   parallel?: boolean
   onProgress?: (info: DownloadProgress) => void
};

export type DownloadGameResponse = {
   status: boolean,
   message: string,
   metaData?: IItchRecord,
   metadataPath?: string,
   filePath?: string
};
```

## Example Output

Example response:

```bash
const response = {
   status: true,
   message: 'Download and file operations successful.',
   metadataPath: 'C:\\Users\\Aquataze\\Desktop\\itchDownloader\\testOutput\\manic-miners\\manic-miners-metadata.json',
   filePath: 'C:\\Users\\Aquataze\\Desktop\\itchDownloader\\testOutput\\manic-miners\\ManicMinersV1.0.zip',
   metaData: {
      title: 'Manic Miners: A LEGO Rock Raiders remake',
      coverImage: 'https://img.itch.zone/aW1nLzEzMTQ1NzA1LnBuZw==/315x250%23c/i%2BJ4qs.png',
      authors: [[Object]],
      tags: [],
      id: 598634,
      commentsLink: 'https://baraklava.itch.io/manic-miners/comments',
      selfLink: 'https://baraklava.itch.io/manic-miners',
      author: 'baraklava',
      name: 'manic-miners',
      domain: '.itch.io',
      itchGameUrl: 'https://baraklava.itch.io/manic-miners',
      itchMetaDataUrl: 'https://baraklava.itch.io/manic-miners/data.json'
   }
};

```

## Documentation

More documentation:

- [docs/README.md](docs/README.md) – Overview
- [docs/Installation.md](docs/Installation.md) – Setup requirements
- [docs/API-Reference.md](docs/API-Reference.md) – Full API details
- [docs/CLI.md](docs/CLI.md) – Command line usage
- [docs/Advanced-Usage.md](docs/Advanced-Usage.md) – Concurrency and custom paths
- [docs/Debugging.md](docs/Debugging.md) – Troubleshooting tips
- [docs/Roadmap.md](docs/Roadmap.md) – Future development plans
- [CONTRIBUTING.md](CONTRIBUTING.md) – Contribution guidelines
- [CHANGELOG.md](CHANGELOG.md) – Release history

## Contributing

Contributions are welcome! Fork the repo and submit a pull request. For major changes, open an issue first. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

Update tests as needed.
Run `pnpm test` and build the CLI with `pnpm run build-cli`.
Publishing runs the `prepublishOnly` script to build the CLI.

## Development Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/Wal33D/itchio-downloader.git
cd itchio-downloader
pnpm install
```

`pnpm install` installs `ts-jest` and other dev dependencies required for the test suite. Running tests without installing these packages will result in a "Preset ts-jest not found" error.

Run the tests with:

```bash
pnpm test
```

## Release Procedure

1. Update the version in `package.json`.
2. Document changes in `CHANGELOG.md`.
3. Run `pnpm publish` (the `prepublishOnly` script builds the CLI).

## Maintenance

Dependabot monitors dependencies and opens PRs.

## License

ISC License.
