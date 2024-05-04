# Itchio-Downloader

Itchio-Downloader is a Node.js package designed to programmatically download games from [itch.io](https://itch.io). Leveraging Puppeteer for web interactions, this tool simplifies the process of acquiring game files directly from URLs or by specifying the game name and author.

## Features

-  Download games directly from itch.io using either a specific URL or by specifying the game's name and author.
-  Support for downloading multiple games in a batch operation.
-  Customizable settings for file renaming and download directories.
-  Built-in cleaning options to manage download directories effectively.

## Installation

To install Itchio-Downloader, ensure you have Node.js and npm (or Yarn) installed on your computer. From your terminal, run:

```bash
npm install itchio-downloader
# or
yarn add itchio-downloader
```

````

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
   desiredFileDirectory: 'full file path', // Optional
   cleanDirectory: true // Optional
});
```

### Downloading Multiple Games

To download multiple games, provide an array of parameters for each game. You can mix URL and name/author specifications within the same operation:

```javascript
async function downloadMultipleGames() {
   const gameParams = [
      { name: 'manic-miners', author: 'baraklava', cleanDirectory: true },
      { itchGameUrl: 'https://anotherdev.itch.io/another-game', cleanDirectory: true }
   ];

   await downloadGame(gameParams);
}
downloadMultipleGames();
```

## Configuration Options

The `downloadGame` function accepts the following parameters within `DownloadGameParams`:

-  `name`: (Optional) The name of the game (used in conjunction with `author`).
-  `author`: (Optional) The author's username on itch.io (used with `name`).
-  `itchGameUrl`: (Optional) Direct URL to the game's itch.io page.
-  `desiredFileName`: (Optional) Specify a custom filename for the downloaded file.
-  `desiredFileDirectory`: (Optional) Directory where the downloaded files should be saved.
-  `cleanDirectory`: (Optional) Whether to clean the directory before downloading the files.

## Contributing

Contributions are welcome! Please fork the repository and submit pull requests with any enhancements. For major changes, open an issue first to discuss what you would like to change.

Ensure to update tests as appropriate.
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

## License

Distributed under the ISC License.
````
