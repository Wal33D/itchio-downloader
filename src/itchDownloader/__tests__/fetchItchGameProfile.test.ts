import { fetchItchGameProfile } from '../fetchItchGameProfile';
import * as urlParser from '../parseItchGameUrl';
import * as metadataParser from '../parseItchGameMetadata';

describe('fetchItchGameProfile', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('combines url data and metadata', async () => {
    jest.spyOn(urlParser, 'parseItchGameUrl').mockReturnValue({
      parsed: true,
      author: 'author',
      name: 'game',
      domain: 'itch.io',
      itchGameUrl: 'https://author.itch.io/game',
      message: 'ok'
    } as any);

    jest.spyOn(metadataParser, 'parseItchGameMetadata').mockResolvedValue({
      jsonParsed: true,
      message: 'ok',
      title: 'Game',
      coverImage: 'cover.jpg',
      authors: [],
      tags: [],
      id: 1,
      commentsLink: 'c',
      selfLink: 's',
      itchMetaDataUrl: 'https://author.itch.io/game/data.json'
    } as any);

    const result = await fetchItchGameProfile({ itchGameUrl: 'https://author.itch.io/game' });
    expect(result.found).toBe(true);
    expect(result.itchRecord?.author).toBe('author');
    expect(result.itchRecord?.title).toBe('Game');
  });

  it('throws when both parsers fail', async () => {
    jest.spyOn(urlParser, 'parseItchGameUrl').mockImplementation(() => {
      throw new Error('bad url');
    });
    jest.spyOn(metadataParser, 'parseItchGameMetadata').mockRejectedValue(new Error('bad meta'));

    await expect(
      fetchItchGameProfile({ itchGameUrl: 'https://author.itch.io/game' })
    ).rejects.toThrow('Both URL parsing and metadata fetching failed');
  });
});
