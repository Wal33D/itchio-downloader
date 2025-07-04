import { parseItchGameUrl } from '../parseItchGameUrl';

describe('parseItchGameUrl', () => {
  it('parses a valid Itch.io url', () => {
    const url = 'https://author.itch.io/game';
    const result = parseItchGameUrl({ itchGameUrl: url });
    expect(result.parsed).toBe(true);
    expect(result.author).toBe('author');
    expect(result.name).toBe('game');
    expect(result.itchGameUrl).toBe(url);
  });

  it('parses the Break Like A Baby url', () => {
    const url = 'https://kimyalastname.itch.io/break-like-a-baby';
    const result = parseItchGameUrl({ itchGameUrl: url });
    expect(result.parsed).toBe(true);
    expect(result.author).toBe('kimyalastname');
    expect(result.name).toBe('break-like-a-baby');
    expect(result.itchGameUrl).toBe(url);
  });

  it('returns parsed false for invalid url', () => {
    const url = 'https://example.com/game';
    const result = parseItchGameUrl({ itchGameUrl: url });
    expect(result.parsed).toBe(false);
    expect(result.author).toBeUndefined();
    expect(result.name).toBeUndefined();
    expect(result.itchGameUrl).toBe(url);
  });
});
