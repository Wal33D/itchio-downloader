import { streamToFile, streamToBuffer, downloadWithResume, StreamResult } from './httpDownload';
import { DownloadProgress } from './types';

export class ItchApiClient {
  private baseUrl: string;
  constructor(private apiKey: string, baseUrl?: string) {
    this.baseUrl = baseUrl || 'https://api.itch.io';
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number>): string {
    const url = new URL(endpoint.startsWith('http') ? endpoint : this.baseUrl + endpoint);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private get headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  async get<T = unknown>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) {
      const err = new Error(`Request failed with status ${res.status}`) as Error & { statusCode: number; body: string };
      err.statusCode = res.status;
      err.body = await res.text().catch(() => '');
      throw err;
    }
    return res.json() as Promise<T>;
  }

  async download(
    endpoint: string,
    filePath: string,
    onProgress?: (info: DownloadProgress) => void,
  ): Promise<StreamResult> {
    const url = this.buildUrl(endpoint);
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) {
      const err = new Error(`Download failed with status ${res.status}`) as Error & { statusCode: number; body: string };
      err.statusCode = res.status;
      err.body = await res.text().catch(() => '');
      throw err;
    }
    return streamToFile(res, filePath, onProgress);
  }

  async downloadWithResume(
    endpoint: string,
    filePath: string,
    onProgress?: (info: DownloadProgress) => void,
  ): Promise<StreamResult> {
    const url = this.buildUrl(endpoint);
    return downloadWithResume(url, filePath, this.headers, onProgress);
  }

  async downloadToBuffer(
    endpoint: string,
    onProgress?: (info: DownloadProgress) => void,
    fileName?: string,
  ): Promise<Buffer> {
    const url = this.buildUrl(endpoint);
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) {
      const err = new Error(`Download failed with status ${res.status}`) as Error & { statusCode: number; body: string };
      err.statusCode = res.status;
      err.body = await res.text().catch(() => '');
      throw err;
    }
    return streamToBuffer(res, onProgress, fileName);
  }
}
