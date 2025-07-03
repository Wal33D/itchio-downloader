# API Reference

Itchio-Downloader exposes a single main function `downloadGame` along with related TypeScript types. Import it from the package root:

```javascript
const { downloadGame } = require('itchio-downloader');
```

## downloadGame(params, concurrency?)

Downloads one or more games from itch.io. When an array of parameter objects is supplied, multiple games can be fetched sequentially or in parallel.

### Parameters

- `params` – Either a single `DownloadGameParams` object or an array of them. Each object accepts:
  - `name` *(string, optional)* – Game name, used with `author`.
  - `author` *(string, optional)* – Author's username on itch.io.
  - `itchGameUrl` *(string, optional)* – Direct URL to the game's page.
  - `desiredFileName` *(string, optional)* – Rename the downloaded file.
  - `downloadDirectory` *(string, optional)* – Directory for the downloaded files.
  - `writeMetaData` *(boolean, optional)* – Write a metadata JSON file alongside the download.
  - `parallel` *(boolean, optional)* – When used inside an array, run this download concurrently via `Promise.all`.
- `concurrency` *(number, optional)* – When `params` is an array and `parallel` is not set, limits how many downloads happen at once. Defaults to `1`.

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

The `metaData` object mirrors the information fetched from the game's `data.json` file.

## Example

```javascript
await downloadGame({
  itchGameUrl: 'https://baraklava.itch.io/manic-miners',
  desiredFileName: 'manic-miners-latest'
});
```

See the [Examples](Examples.md) page for more sample scripts.
