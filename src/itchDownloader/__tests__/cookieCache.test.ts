import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  getCachedCookies,
  setCachedCookies,
  clearCachedCookies,
  mergeCookies,
} from '../cookieCache';

describe('cookieCache', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cookie-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  });

  it('returns null for uncached domain', async () => {
    const result = await getCachedCookies('https://unknown.itch.io/game', tmpDir);
    expect(result).toBeNull();
  });

  it('stores and retrieves cookies by domain', async () => {
    await setCachedCookies('https://author.itch.io/game', 'session=abc; csrf=xyz', 'tok123', tmpDir);
    const result = await getCachedCookies('https://author.itch.io/other-game', tmpDir);
    expect(result).not.toBeNull();
    expect(result!.cookies).toBe('session=abc; csrf=xyz');
    expect(result!.csrfToken).toBe('tok123');
  });

  it('different domains have separate caches', async () => {
    await setCachedCookies('https://alice.itch.io/game', 'sess=a', undefined, tmpDir);
    await setCachedCookies('https://bob.itch.io/game', 'sess=b', undefined, tmpDir);

    const alice = await getCachedCookies('https://alice.itch.io/game', tmpDir);
    const bob = await getCachedCookies('https://bob.itch.io/game', tmpDir);

    expect(alice!.cookies).toBe('sess=a');
    expect(bob!.cookies).toBe('sess=b');
  });

  it('clearCachedCookies removes specific domain', async () => {
    await setCachedCookies('https://author.itch.io/game', 'sess=x', undefined, tmpDir);
    await clearCachedCookies('https://author.itch.io/game', tmpDir);
    const result = await getCachedCookies('https://author.itch.io/game', tmpDir);
    expect(result).toBeNull();
  });

  it('clearCachedCookies without URL removes all', async () => {
    await setCachedCookies('https://a.itch.io/g', 'x=1', undefined, tmpDir);
    await setCachedCookies('https://b.itch.io/g', 'x=2', undefined, tmpDir);
    await clearCachedCookies(undefined, tmpDir);
    const a = await getCachedCookies('https://a.itch.io/g', tmpDir);
    const b = await getCachedCookies('https://b.itch.io/g', tmpDir);
    expect(a).toBeNull();
    expect(b).toBeNull();
  });

  it('expired cookies are not returned', async () => {
    await setCachedCookies('https://author.itch.io/game', 'sess=old', undefined, tmpDir);

    // Manually set the savedAt to 1 hour ago
    const cachePath = path.join(tmpDir, 'cookie-cache.json');
    const store = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    store['author.itch.io'].savedAt = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
    fs.writeFileSync(cachePath, JSON.stringify(store));

    const result = await getCachedCookies('https://author.itch.io/game', tmpDir);
    expect(result).toBeNull();
  });
});

describe('mergeCookies', () => {
  it('merges non-overlapping cookies', () => {
    const result = mergeCookies('a=1', 'b=2');
    expect(result).toBe('a=1; b=2');
  });

  it('later values override earlier for same name', () => {
    const result = mergeCookies('a=1; b=old', 'b=new');
    expect(result).toBe('a=1; b=new');
  });

  it('handles empty strings', () => {
    expect(mergeCookies('', 'a=1')).toBe('a=1');
    expect(mergeCookies('a=1', '')).toBe('a=1');
    expect(mergeCookies('', '')).toBe('');
  });
});
