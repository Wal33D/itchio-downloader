export interface CLIArgs {
  url?: string;
  collection?: string;
  name?: string;
  author?: string;
  downloadDirectory?: string;
  apiKey?: string;
  retries?: number;
  retryDelay?: number;
  concurrency?: number;
  memory?: boolean;
}
