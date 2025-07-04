import http from 'http';
import { parseItchGameMetadata } from '../itchDownloader/parseItchGameMetadata';

describe('integration download via local server', () => {
  let server: http.Server;
  let port: number;

  beforeAll((done) => {
    server = http
      .createServer((req, res) => {
        if (req.url === '/fake.itch.io/game/data.json') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              title: 'Game',
              cover_image: 'img.png',
              authors: [],
              links: { comments: '', self: '' },
              id: 1,
            }),
          );
        } else {
          res.writeHead(404);
          res.end();
        }
      })
      .listen(0, () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        port = (server.address() as any).port;
        done();
      });
  });

  afterAll(() => {
    server.close();
  });

  it('retrieves metadata from local server', async () => {
    const result = await parseItchGameMetadata({
      itchGameUrl: `http://localhost:${port}/fake.itch.io/game/data.json`,
    });
    expect(result.jsonParsed).toBe(true);
    expect(result.title).toBe('Game');
  });
});
