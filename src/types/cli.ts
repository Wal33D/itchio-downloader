export interface CLIArgs {
  url?: string;
  name?: string;
  author?: string;
  downloadDirectory?: string;
  apiKey?: string;
  retries?: number;
  retryDelay?: number;
  concurrency?: number;
}
