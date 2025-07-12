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
    const fs = await import('fs/promises');
    const path = await import('path');
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    if (onProgress) {
      onProgress({ bytesReceived: buffer.length, totalBytes: total, fileName: path.basename(filePath) });
    }
  }
}
