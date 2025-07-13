# API Reference

Itchio-Downloader exposes a single main function `downloadGame` along with related TypeScript types. Import it from the package root.
The library requires **Node.js 18+** for the native `fetch` API:

```javascript
const { downloadGame } = require('itchio-downloader');
```

## downloadGame(params, concurrency?)

Downloads one or more games from itch.io. When an array of parameter objects is supplied, multiple games can be fetched sequentially or in parallel.

### Parameters

- `params` – Either a single `DownloadGameParams` object or an array of them. Each object accepts:
  - `name` _(string, optional)_ – Game name, used with `author`.
  - `author` _(string, optional)_ – Author's username on itch.io.
  - `itchGameUrl` _(string, optional)_ – Direct URL to the game's page.
  - `desiredFileName` _(string, optional)_ – Rename the downloaded file.
  - `downloadDirectory` _(string, optional)_ – Directory for the downloaded files.
  - `apiKey` _(string, optional)_ – itch.io API key for authenticated downloads.
    If omitted, the library checks the `ITCH_API_KEY` environment variable.
  - `writeMetaData` _(boolean, optional)_ – Write a metadata JSON file alongside the download.
  - `parallel` _(boolean, optional)_ – When used inside an array, run this download concurrently via `Promise.all`.
  - `onProgress` _(function, optional)_ – Receives `{ bytesReceived, totalBytes, fileName }` as the download proceeds.
- `concurrency` _(number, optional)_ – When `params` is an array and `parallel` is not set, limits how many downloads happen at once. Defaults to `1`.

### Returns

A promise that resolves to `DownloadGameResponse` or an array of responses.

```javascript
type DownloadGameResponse = {
  status: boolean;
  message: string;
  metaData?: IItchRecord;
  metadataPath?: string;
  filePath?: string;
};
```

Progress information is delivered via the `DownloadProgress` interface when
`onProgress` is provided:

```javascript
interface DownloadProgress {
  bytesReceived: number;
  totalBytes?: number;
  fileName?: string;
}
```

The `metaData` object mirrors the information fetched from the game's `data.json` file.

## Example

```javascript
await downloadGame({
  itchGameUrl: 'https://baraklava.itch.io/manic-miners',
  desiredFileName: 'manic-miners-latest',
});
```

See [Advanced Usage](Advanced-Usage.md) for concurrency and custom path examples.
For troubleshooting and debug logs, see the [Debugging](Debugging.md) guide.
