import { parseItchGameUrl } from '../src/itchDownloader/parseItchGameUrl';

describe('parseItchGameUrl', () => {
  it('parses author and name from a valid itch.io URL', () => {
    const url = 'https://foo.itch.io/bar';
    const result = parseItchGameUrl({ itchGameUrl: url });
    expect(result.parsed).toBe(true);
    expect(result.author).toBe('foo');
    expect(result.name).toBe('bar');
  });

  it('returns parsed false for an invalid URL', () => {
    const url = 'https://example.com/notitch';
    const result = parseItchGameUrl({ itchGameUrl: url });
    expect(result.parsed).toBe(false);
  });
});
