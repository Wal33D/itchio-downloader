# Advanced Usage

This page contains additional examples for managing multiple downloads and customizing output paths.

## Concurrent Downloads with `concurrency`

Limit how many downloads run at once by passing a `concurrency` value when downloading an array of games:

```javascript
const games = [
  { name: 'manic-miners', author: 'baraklava' },
  { name: 'another-game', author: 'anotherdev' },
  { name: 'better-game', author: 'moregames' }
];

await downloadGame(games, 2); // up to two downloads at the same time
```

## Running Downloads in Parallel

Set `parallel: true` on each item to execute all downloads concurrently using `Promise.all`:

```javascript
const games = [
  { itchGameUrl: 'https://dev1.itch.io/game-one', parallel: true },
  { itchGameUrl: 'https://dev2.itch.io/game-two', parallel: true }
];

await downloadGame(games); // runs both downloads in parallel
```

## Custom File Paths

You can control where files are saved and what they are named by using `downloadDirectory` and `desiredFileName`:

```javascript
await downloadGame({
  itchGameUrl: 'https://baraklava.itch.io/manic-miners',
  downloadDirectory: '/path/to/games',
  desiredFileName: 'manic-miners-latest.zip'
});
```
