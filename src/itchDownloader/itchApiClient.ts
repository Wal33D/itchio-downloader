export class ItchApiClient {
  private baseUrl: string;
  constructor(private apiKey: string, baseUrl?: string) {
    this.baseUrl = baseUrl || 'https://api.itch.io';
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number>): string {
    const url = new URL(endpoint.startsWith('http') ? endpoint : this.baseUrl + endpoint);
    url.searchParams.set('api_key', this.apiKey);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  async get<T = any>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const res = await fetch(url);
    if (!res.ok) {
      const err: any = new Error(`Request failed with status ${res.status}`);
      err.statusCode = res.status;
      err.body = await res.text().catch(() => '');
      throw err;
    }
    return res.json() as Promise<T>;
  }

  async download(
    endpoint: string,
    filePath: string,
    onProgress?: (info: { bytesReceived: number; totalBytes?: number; fileName?: string }) => void,
  ): Promise<void> {
    const url = this.buildUrl(endpoint);
    const res = await fetch(url);
    if (!res.ok) {
      const err: any = new Error(`Download failed with status ${res.status}`);
      err.statusCode = res.status;
      err.body = await res.text().catch(() => '');
      throw err;
    }
    const total = Number(res.headers.get('content-length') || '0') || undefined;
    const fsPromises = await import('fs/promises');
    const fs = await import('fs');
    const path = await import('path');
    await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
    const { pipeline } = await import('stream/promises');
    const { Readable } = await import('stream');
    const writeStream = fs.createWriteStream(filePath);
    let readable: import('stream').Readable;
    if (res.body && typeof (res.body as any).getReader === 'function') {
      readable = Readable.fromWeb(res.body as any);
    } else if (res.body) {
      readable = res.body as any as import('stream').Readable;
    } else {
      readable = Readable.from(Buffer.alloc(0));
    }
    let bytes = 0;
    readable.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (onProgress) {
        onProgress({ bytesReceived: bytes, totalBytes: total, fileName: path.basename(filePath) });
      }
    });
    await pipeline(readable, writeStream);
  }
}
