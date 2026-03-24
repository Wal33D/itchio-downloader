import { downloadJam } from '../downloadJam';
import * as downloadGameMod from '../downloadGame';

const jamPageHtml = `
<html>
<script>I.ViewJam('#view_jam_12345', {"id":99999,"title":"Test Jam"})</script>
</html>
`;

const entriesJson = {
  jam_games: [
    { game: { url: 'https://alice.itch.io/game-a', title: 'Game A' } },
    { game: { url: 'https://bob.itch.io/game-b', title: 'Game B' } },
    { game: { url: 'https://carol.itch.io/game-c', title: 'Game C' } },
  ],
};

describe('downloadJam', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    (global.fetch as any)?.mockRestore?.();
  });

  it('fetches jam page, extracts ID, downloads all entries', async () => {
    const fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    // Step 1: GET jam page HTML
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => jamPageHtml,
    });
    // Step 2: GET entries.json
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => entriesJson,
    });

    const dgMock = jest
      .spyOn(downloadGameMod, 'downloadGame')
      .mockResolvedValue('done' as any);

    await downloadJam('https://itch.io/jam/test-jam', undefined, {
      downloadDirectory: '/tmp/jam',
      concurrency: 2,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(dgMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({ itchGameUrl: 'https://alice.itch.io/game-a', downloadDirectory: '/tmp/jam' }),
        expect.objectContaining({ itchGameUrl: 'https://bob.itch.io/game-b' }),
        expect.objectContaining({ itchGameUrl: 'https://carol.itch.io/game-c' }),
      ],
      2,
    );
  });

  it('passes resume and cookie options through', async () => {
    const fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => jamPageHtml });
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => entriesJson });

    const dgMock = jest
      .spyOn(downloadGameMod, 'downloadGame')
      .mockResolvedValue('done' as any);

    await downloadJam('https://itch.io/jam/test-jam', undefined, {
      resume: true,
      noCookieCache: true,
      cookieCacheDir: '/tmp/cookies',
    });

    expect(dgMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({ resume: true, noCookieCache: true, cookieCacheDir: '/tmp/cookies' }),
        expect.objectContaining({ resume: true, noCookieCache: true }),
        expect.objectContaining({ resume: true, noCookieCache: true }),
      ],
      1,
    );
  });

  it('passes API key to each game', async () => {
    const fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => jamPageHtml });
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => entriesJson });

    const dgMock = jest
      .spyOn(downloadGameMod, 'downloadGame')
      .mockResolvedValue('done' as any);

    await downloadJam('https://itch.io/jam/test-jam', 'my-key');

    expect(dgMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ apiKey: 'my-key' }),
      ]),
      1,
    );
  });

  it('returns error when jam has no entries', async () => {
    const fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => jamPageHtml });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jam_games: [] }),
    });

    const result = await downloadJam('https://itch.io/jam/empty-jam');
    expect(result).toEqual(
      expect.objectContaining({ status: false, message: expect.stringContaining('No game entries') }),
    );
  });

  it('throws on invalid jam URL', async () => {
    await expect(downloadJam('https://itch.io/not-a-jam')).rejects.toThrow('Invalid jam URL');
  });

  it('throws when jam page returns HTTP error', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    await expect(downloadJam('https://itch.io/jam/nonexistent')).rejects.toThrow('HTTP 404');
  });

  it('throws when jam ID cannot be extracted from page', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html>No ViewJam call here</html>',
    });

    await expect(downloadJam('https://itch.io/jam/broken')).rejects.toThrow('Could not extract jam ID');
  });

  it('throws when entries endpoint returns HTTP error', async () => {
    const fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => jamPageHtml });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(downloadJam('https://itch.io/jam/test-jam')).rejects.toThrow('HTTP 500');
  });

  it('filters out entries without game URLs', async () => {
    const fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => jamPageHtml });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jam_games: [
          { game: { url: 'https://a.itch.io/game', title: 'A' } },
          { game: { title: 'No URL' } },
          { game: null },
          {},
        ],
      }),
    });

    const dgMock = jest
      .spyOn(downloadGameMod, 'downloadGame')
      .mockResolvedValue('done' as any);

    await downloadJam('https://itch.io/jam/test-jam');

    const params = dgMock.mock.calls[0][0] as any[];
    expect(params.length).toBe(1);
    expect(params[0].itchGameUrl).toBe('https://a.itch.io/game');
  });
});
