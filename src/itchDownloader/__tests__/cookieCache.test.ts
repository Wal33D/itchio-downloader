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

  it('overwrites cookies for the same domain', async () => {
    await setCachedCookies('https://author.itch.io/game', 'old=cookie', 'oldtok', tmpDir);
    await setCachedCookies('https://author.itch.io/game', 'new=cookie', 'newtok', tmpDir);

    const result = await getCachedCookies('https://author.itch.io/game', tmpDir);
    expect(result!.cookies).toBe('new=cookie');
    expect(result!.csrfToken).toBe('newtok');
  });

  it('stores cookies without csrfToken', async () => {
    await setCachedCookies('https://author.itch.io/game', 'sess=x', undefined, tmpDir);
    const result = await getCachedCookies('https://author.itch.io/game', tmpDir);
    expect(result!.cookies).toBe('sess=x');
    expect(result!.csrfToken).toBeUndefined();
  });

  it('clearCachedCookies removes specific domain', async () => {
    await setCachedCookies('https://author.itch.io/game', 'sess=x', undefined, tmpDir);
    await clearCachedCookies('https://author.itch.io/game', tmpDir);
    const result = await getCachedCookies('https://author.itch.io/game', tmpDir);
    expect(result).toBeNull();
  });

  it('clearCachedCookies for one domain preserves others', async () => {
    await setCachedCookies('https://a.itch.io/g', 'x=1', undefined, tmpDir);
    await setCachedCookies('https://b.itch.io/g', 'x=2', undefined, tmpDir);
    await clearCachedCookies('https://a.itch.io/g', tmpDir);

    expect(await getCachedCookies('https://a.itch.io/g', tmpDir)).toBeNull();
    expect((await getCachedCookies('https://b.itch.io/g', tmpDir))!.cookies).toBe('x=2');
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

    // Manually set the savedAt to 2 hours ago (> 30 min TTL)
    const cachePath = path.join(tmpDir, 'cookie-cache.json');
    const store = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    store['author.itch.io'].savedAt = Date.now() - 2 * 60 * 60 * 1000;
    fs.writeFileSync(cachePath, JSON.stringify(store));

    const result = await getCachedCookies('https://author.itch.io/game', tmpDir);
    expect(result).toBeNull();
  });

  it('cookies just under TTL are returned', async () => {
    await setCachedCookies('https://author.itch.io/game', 'sess=fresh', undefined, tmpDir);

    // Set savedAt to 25 minutes ago (< 30 min TTL)
    const cachePath = path.join(tmpDir, 'cookie-cache.json');
    const store = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    store['author.itch.io'].savedAt = Date.now() - 25 * 60 * 1000;
    fs.writeFileSync(cachePath, JSON.stringify(store));

    const result = await getCachedCookies('https://author.itch.io/game', tmpDir);
    expect(result).not.toBeNull();
    expect(result!.cookies).toBe('sess=fresh');
  });

  it('recovers from corrupted cache file', async () => {
    const cachePath = path.join(tmpDir, 'cookie-cache.json');
    fs.writeFileSync(cachePath, 'not valid json{{{');

    // Should not throw — returns null gracefully
    const result = await getCachedCookies('https://author.itch.io/game', tmpDir);
    expect(result).toBeNull();

    // Should still be able to write new cookies (overwrites corrupted file)
    await setCachedCookies('https://author.itch.io/game', 'sess=new', undefined, tmpDir);
    const result2 = await getCachedCookies('https://author.itch.io/game', tmpDir);
    expect(result2!.cookies).toBe('sess=new');
  });

  it('creates cache directory if it does not exist', async () => {
    const nestedDir = path.join(tmpDir, 'nested', 'deep', 'dir');
    await setCachedCookies('https://author.itch.io/game', 'sess=x', undefined, nestedDir);
    const result = await getCachedCookies('https://author.itch.io/game', nestedDir);
    expect(result!.cookies).toBe('sess=x');
  });

  it('handles URLs with ports and paths correctly', async () => {
    await setCachedCookies('https://author.itch.io:8080/game/subpath', 'sess=port', undefined, tmpDir);
    // Same hostname with port should retrieve
    const result = await getCachedCookies('https://author.itch.io:8080/other', tmpDir);
    expect(result!.cookies).toBe('sess=port');
  });

  it('clearCachedCookies with nonexistent file does not throw', async () => {
    // Should not throw even if cache file doesn't exist
    await expect(clearCachedCookies(undefined, tmpDir)).resolves.toBeUndefined();
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

  it('handles cookies with = in value', () => {
    const result = mergeCookies('tok=abc=def', 'sid=123');
    // The key should be 'tok', value 'abc=def'
    expect(result).toContain('tok=abc=def');
    expect(result).toContain('sid=123');
  });

  it('preserves order: existing first, then new', () => {
    const result = mergeCookies('a=1; b=2', 'c=3');
    expect(result).toBe('a=1; b=2; c=3');
  });

  it('merges multiple overlapping cookies correctly', () => {
    const result = mergeCookies('a=1; b=2; c=3', 'b=NEW; d=4');
    expect(result).toBe('a=1; b=NEW; c=3; d=4');
  });
});
