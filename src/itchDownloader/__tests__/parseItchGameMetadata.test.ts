import { parseItchGameMetadata } from '../parseItchGameMetadata';

const mockMetadata = {
  title: 'My Game',
  cover_image: 'cover.jpg',
  authors: ['author'],
  links: { comments: 'comments', self: 'self' },
  id: 123,
  tags: ['tag1', 'tag2'],
};

describe('parseItchGameMetadata', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMetadata),
      })
    ) as any;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('fetches and parses metadata from url', async () => {
    const result = await parseItchGameMetadata({ itchGameUrl: 'https://author.itch.io/game/data.json' });
    expect(result.jsonParsed).toBe(true);
    expect(result.title).toBe(mockMetadata.title);
    expect(result.coverImage).toBe(mockMetadata.cover_image);
    expect(result.commentsLink).toBe(mockMetadata.links.comments);
  });

  it('returns jsonParsed false for invalid url', async () => {
    const result = await parseItchGameMetadata({ itchGameUrl: 'https://author.itch.io/game' });
    expect(result.jsonParsed).toBe(false);
  });
});
