# Itchio-Downloader

**GitHub Repository:** [itchio-downloader on GitHub](https://github.com/Wal33D/itchio-downloader)

**npm Package:** [itchio-downloader on npm](https://www.npmjs.com/package/itchio-downloader)

Itchio-Downloader downloads free games from [itch.io](https://itch.io) via URL or by name and author—no API key or GUI needed.

See the [API Reference](docs/API-Reference.md) for all functions and types.

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

-  **Direct Downloads**: Get games by URL or by name and author—no desktop GUI or Butler.
-  **Batch Operations**: Download multiple games in one run.
-  **Customization**: Rename files and choose download directories.
-  **Simplicity**: Only a URL or author and title is required.
-  **No API Key Required**: Works without an API key.

## Usage Policy

Only download free games and follow the [itch.io Terms of Service](https://itch.io/docs/general/terms). Don't bypass payment restrictions. This project isn't affiliated with or endorsed by itch.io.

## Quick Start

Requires **Node.js 18+** for the built-in `fetch` API:

```bash
nvm install 18
nvm use 18
# or install directly from https://nodejs.org and verify
node -v
```

If using an older Node, add a `fetch` polyfill like `node-fetch`.

Install the package:

```bash
npm install itchio-downloader
# or
yarn add itchio-downloader
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
      { itchGameUrl: 'https://moregames.itch.io/better-game', parallel: true }
   ];

   await downloadGame(gameParams, 2); // up to 2 downloads or set parallel to run all at once
}
downloadMultipleGames();
```

See [docs/Advanced-Usage.md](docs/Advanced-Usage.md) for more concurrency and custom path examples.

## Command Line Usage
Build the CLI with `npm run build-cli` (or `yarn build-cli`), then run `itchio-downloader` with your options. Full details are in [docs/CLI.md](docs/CLI.md).
## Configuration Options

The `downloadGame` function accepts the following parameters within `DownloadGameParams`:

-  `name`: Game name (use with `author`).
-  `author`: Author's username.
-  `itchGameUrl`: Direct URL to the game.
-  `desiredFileName`: Custom file name.
-  `downloadDirectory`: Where to save files.
-  `writeMetaData`: Save metadata JSON (default `true`).
-  `concurrency`: Number of downloads at once when using an array.
-  `parallel`: If true, run all downloads concurrently with `Promise.all`.

## Types

```javascript
export type DownloadGameParams = {
   name?: string,
   author?: string,
   desiredFileName?: string,
   downloadDirectory?: string,
   itchGameUrl?: string,
   writeMetaData?: boolean,
   parallel?: boolean
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

- [docs/Home.md](docs/Home.md) – Overview of the documentation
- [docs/API-Reference.md](docs/API-Reference.md) – Full API details
- [docs/CLI.md](docs/CLI.md) – Command line usage
- [docs/Advanced-Usage.md](docs/Advanced-Usage.md) – Concurrency and custom paths
- [docs/Debugging.md](docs/Debugging.md) – Troubleshooting tips
- [CONTRIBUTING.md](CONTRIBUTING.md) – Contribution guidelines
- [CHANGELOG.md](CHANGELOG.md) – Release history

## Contributing

Contributions are welcome! Fork the repo and submit a pull request. For major changes, open an issue first. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

Update tests as needed.
Run `npm test` and build the CLI with `npm run build-cli`.
Publishing runs the `prepublishOnly` script to build the CLI.
## Release Procedure
1. Update the version in `package.json`.
2. Document changes in `CHANGELOG.md`.
3. Run `npm publish` (the `prepublishOnly` script builds the CLI).


## Maintenance

Dependabot monitors dependencies and opens PRs.

## License

ISC License.
