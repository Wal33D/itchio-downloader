# Advanced Usage

This page covers more complex scenarios for `downloadGame`. These examples show how to control concurrency, run downloads in parallel, and save files to custom locations.

## Controlled concurrency

Pass an array of game parameters along with a numeric `concurrency` value. Only that many downloads will run at once:

```javascript
const games = [
  { itchGameUrl: 'https://example.itch.io/game-one' },
  { itchGameUrl: 'https://example.itch.io/game-two' },
  { itchGameUrl: 'https://example.itch.io/game-three' }
];

await downloadGame(games, 2); // at most two downloads at a time
```

## Using `parallel: true`

Set `parallel: true` on individual items to run every download concurrently via `Promise.all`:

```javascript
await downloadGame([
  { itchGameUrl: 'https://example.itch.io/game-one', parallel: true },
  { itchGameUrl: 'https://example.itch.io/game-two', parallel: true },
  { itchGameUrl: 'https://example.itch.io/game-three', parallel: true }
]);
```

## Custom file paths

Specify `downloadDirectory` and `desiredFileName` to control where each file is saved and what it is called:

```javascript
await downloadGame({
  itchGameUrl: 'https://example.itch.io/game',
  downloadDirectory: '/path/to/games',
  desiredFileName: 'my-game.zip'
});
```
