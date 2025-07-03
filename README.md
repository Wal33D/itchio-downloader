# Itchio-Downloader

**GitHub Repository:** [itchio-downloader on GitHub](https://github.com/Wal33D/itchio-downloader)

**npm Package:** [itchio-downloader on npm](https://www.npmjs.com/package/itchio-downloader)

Itchio-Downloader is a Node.js package for programmatically downloading games from [itch.io](https://itch.io). You can access and download any free game directly through URLs or by specifying the game's name and its author's username—no API key or GUI required.

For a full reference of available functions and types, see the [API documentation](https://github.com/Wal33D/itchio-downloader/wiki).

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
10. [Examples](#examples)
11. [Contributing](#contributing)
12. [Release Procedure](#release-procedure)
13. [Maintenance](#maintenance)
14. [License](#license)

## Motivation

I created this tool to build a game launcher/updater for the public/free games that I love. I decided to release this tool so others could use it for similar projects or entirely new ideas. To the best of my knowledge, this is the only programmatic method of downloading itch.io games without requiring an API key, OAuth key, or being the game developer. This makes Itchio-Downloader a unique and useful tool for the community!

## Features

-  **Direct Downloads**: Download games directly from itch.io using either a specific URL or by specifying the game's name and author. No need for the itch.io desktop GUI or Butler.
-  **Batch Operations**: Supports downloading multiple games in a single batch operation, simplifying the process of managing multiple downloads.
-  **Customization**: Offers customizable settings for file renaming and specifying download directories, allowing greater control over how and where your games are saved.
-  **Simplicity**: Designed to be easy to use, requiring only the game URL or the author's name and game title. This makes it accessible even for those who are not familiar with itch.io’s more complex tools.
-  **No API Key Required**: Operates without the need for an API key, making it straightforward to set up and start downloading games.

## Usage Policy

This tool should only be used to download games that are freely available on itch.io. Use of Itchio-Downloader must comply with the [itch.io Terms of Service](https://itch.io/docs/general/terms). Do not use this tool to circumvent payment requirements or any distribution restrictions.
This project is not affiliated with or endorsed by itch.io.

## Quick Start

This project requires **Node.js 18 or later** because it relies on the built-in `fetch` API. Verify your version and install if necessary:

```bash
nvm install 18
nvm use 18
# or install directly from https://nodejs.org and verify
node -v
```

If you must use an older Node version, install a `fetch` polyfill such as `node-fetch`.

After Node is ready, install the package:

```bash
npm install itchio-downloader
# or
yarn add itchio-downloader
```

See [wiki/CLI.md](wiki/CLI.md) for a reference of available command line options.

## Usage

### Importing the package

```javascript
const { downloadGame } = require('itchio-downloader');
```

### Downloading a Single Game

You can download a single game by either specifying a URL or a combination of the game's name and its author's username:

```javascript
// Using a direct URL:
await downloadGame({ itchGameUrl: 'https://baraklava.itch.io/manic-miners' });

// Using name and author and optional params:
await downloadGame({
   name: 'manic-miners',
   author: 'baraklava',
   downloadDirectory: 'full file path', // Optional
   cleanDirectory: true // Optional
});
```

### Downloading Multiple Games

To download multiple games, provide an array of parameters for each game. You can mix URL and name/author specifications within the same operation. An optional `concurrency` argument controls how many downloads run at the same time. Alternatively, set `parallel: true` on any item to run all downloads concurrently using `Promise.all`:

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

## Command Line Usage

To use Itchio-Downloader from the command line:

1. First, ensure the CLI is built:

   ```bash
   npm run build-cli
   # or
   yarn build-cli
   ```

2. Run the command with the required options. For example:

   ```bash
   itchio-downloader --name "manic miners" --author "baraklava"
   ```

   *Quick example:* download a game by URL:

   ```bash
   itchio-downloader --url "https://baraklava.itch.io/manic-miners"
   ```

   This command will start the download process and provide output similar to:

   ```
   Starting downloadGameSingle function...
   Game profile fetched successfully: https://baraklava.itch.io/manic-miners
   Download directory set C:\Users\Aquataze\AppData\Local\ItchDownloader\manic-miners
   Downloading...
   Download and file operations successful.
   Game Download Result: {
      status: true,
      message: 'Download and file operations successful.',
      filePath: 'C:\\Users\\Aquataze\\AppData\\Local\\ItchDownloader\\manic-miners\\ManicMinersV1.0.zip'
   }
   ```

## Configuration Options

The `downloadGame` function accepts the following parameters within `DownloadGameParams`:

-  `name`: (Optional) The name of the game (used in conjunction with `author`).
-  `author`: (Optional) The author's username on itch.io (used with `name`

).

-  `itchGameUrl`: (Optional) Direct URL to the game's itch.io page.
-  `desiredFileName`: (Optional) Specify a custom filename for the downloaded file.
-  `downloadDirectory`: (Optional) Directory where the downloaded files should be saved.
-  `cleanDirectory`: (Optional) Whether to clean the directory before downloading the files.
-  `concurrency`: (Optional) When providing an array of games, this sets how many downloads occur at once.

  `parallel`: (Optional) If `true` when using an array of games, all downloads run concurrently using `Promise.all`.

## Types

```javascript
export type DownloadGameParams = {
   name?: string,
   author?: string,
   cleanDirectory?: boolean,
   desiredFileName?: string,
   downloadDirectory?: string,
   itchGameUrl?: string,
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

The following shows an example response from `npm run test:downloadSingle`:

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

Example scripts used to produce this output are available in the [`examples`](examples) directory.

## Examples

Run the sample scripts with the provided npm commands:

```bash
npm run test:downloadSingle   # single download example
npm run test:downloadMultiple # multiple downloads
npm run test:waitForFile      # waitForFile demo
```

## Contributing

Contributions are welcome! Please fork the repository and submit pull requests with any enhancements. For major changes, open an issue first to discuss what you would like to change. See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

Ensure to update tests as appropriate.

Run `npm test` or `yarn test` to verify all tests pass, and build the CLI with
`npm run build-cli` or `yarn build-cli` when needed.

When publishing to npm, the `prepublishOnly` script defined in `package.json` automatically runs `npm run build-cli` to build the CLI.

## Release Procedure
1. Update the version in `package.json`.
2. Document changes in `CHANGELOG.md`.
3. Run `npm publish` (the `prepublishOnly` script builds the CLI).


## Maintenance

Dependabot automatically monitors dependencies and opens pull requests for updates.

## License

Distributed under the ISC License.
