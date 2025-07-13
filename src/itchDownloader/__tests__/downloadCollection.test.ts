import { downloadCollection } from '../downloadCollection';
import * as downloadGameMod from '../downloadGame';

describe('downloadCollection', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    (global.fetch as any)?.mockRestore?.();
  });

  it('fetches pages and downloads all game urls', async () => {
    const fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          games: [{ url: 'https://a' }, { url: 'https://b' }],
          next_page: 2,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ games: [{ url: 'https://c' }], next_page: null }),
      });

    const dgMock = jest
      .spyOn(downloadGameMod, 'downloadGame')
      .mockResolvedValue('done' as any);

    const res = await downloadCollection('https://itch.io/c/123/test', 'key', {
      downloadDirectory: '/tmp',
      concurrency: 2,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(dgMock).toHaveBeenCalledWith(
      [
        { itchGameUrl: 'https://a', apiKey: 'key', downloadDirectory: '/tmp' },
        { itchGameUrl: 'https://b', apiKey: 'key', downloadDirectory: '/tmp' },
        { itchGameUrl: 'https://c', apiKey: 'key', downloadDirectory: '/tmp' },
      ],
      2,
    );
    expect(res).toBe('done');
  });

  it('omits apiKey when not provided', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ games: [{ url: 'https://a' }], next_page: null }),
    });
    delete process.env.ITCH_API_KEY;
    const dgMock = jest
      .spyOn(downloadGameMod, 'downloadGame')
      .mockResolvedValue('x' as any);
    await downloadCollection('https://itch.io/c/1/test');
    expect(dgMock).toHaveBeenCalledWith([{ itchGameUrl: 'https://a' }], 1);
  });
});
