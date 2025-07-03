# Itchio-Downloader

**GitHub Repository:** [itchio-downloader on GitHub](https://github.com/Wal33D/itchio-downloader)

**npm Package:** [itchio-downloader on npm](https://www.npmjs.com/package/itchio-downloader)

Itchio-Downloader is a Node.js package that enables you to programmatically download games from [itch.io](https://itch.io). This tool allows you to access and download any free game available on itch.io directly through URLs or by specifying the game's name and its author's username, all without the need for an API key, manual interaction, or the itch.io desktop application (GUI) and Butler.

## Motivation

I created this tool to build a game launcher/updater for the public/free games that I love. I decided to release this tool so others could use it for similar projects or entirely new ideas. To the best of my knowledge, this is the only programmatic method of downloading itch.io games without requiring an API key, OAuth key, or being the game developer. This makes Itchio-Downloader a unique and useful tool for the community!

## Features

-  **Direct Downloads**: Download games directly from itch.io using either a specific URL or by specifying the game's name and author. No need for the itch.io desktop GUI or Butler.
-  **Batch Operations**: Supports downloading multiple games in a single batch operation, simplifying the process of managing multiple downloads.
-  **Customization**: Offers customizable settings for file renaming and specifying download directories, allowing greater control over how and where your games are saved.
-  **Simplicity**: Designed to be easy to use, requiring only the game URL or the author's name and game title. This makes it accessible even for those who are not familiar with itch.io’s more complex tools.
-  **No API Key Required**: Operates without the need for an API key, making it straightforward to set up and start downloading games.

## Installation

To install Itchio-Downloader, ensure you have Node.js and npm (or Yarn) installed on your computer. **Node.js 18 or higher is required.** If you are using an older Node version, you will need to provide a `fetch` polyfill. From your terminal, run:

```bash
npm install itchio-downloader
# or
yarn add itchio-downloader
```

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
   yarn build-cli
   ```

2. Run the command with the required options. For example:

   ```bash
   itchio-downloader --name "manic miners" --author "baraklava"
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

## npm run test:downloadSingle --> example response

Single Game Download Result

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

Example scripts used to produce this output are available in the `examples/` directory.

## Contributing

Contributions are welcome! Please fork the repository and submit pull requests with any enhancements. For major changes, open an issue first to discuss what you would like to change.

Ensure to update tests as appropriate.

When publishing to npm, the `prepublishOnly` script defined in `package.json` automatically runs `npm run build-cli` to build the CLI.

## License

Distributed under the ISC License.
