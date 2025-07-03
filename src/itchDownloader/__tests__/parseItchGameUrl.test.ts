import { parseItchGameUrl } from '../parseItchGameUrl';

describe('parseItchGameUrl', () => {
  it('parses a valid Itch.io url', () => {
    const result = parseItchGameUrl({ itchGameUrl: 'https://author.itch.io/game' });
    expect(result.parsed).toBe(true);
    expect(result.author).toBe('author');
    expect(result.name).toBe('game');
  });

  it('returns parsed false for invalid url', () => {
    const result = parseItchGameUrl({ itchGameUrl: 'https://example.com/game' });
    expect(result.parsed).toBe(false);
    expect(result.author).toBeUndefined();
    expect(result.name).toBeUndefined();
  });
});
