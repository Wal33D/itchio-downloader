export type IParsedItchGameUrl = {
  parsed?: boolean;
  author: string | undefined;
  name: string | undefined;
  domain: string | undefined;
  message?: string;
  itchGameUrl: string;
};

export interface IParsedItchGameMetadata {
  jsonParsed?: boolean;
  message?: string;
  statusCode?: number;
  title?: string;
  coverImage?: string;
  authors?: { url: string; name: string }[];
  tags?: string[];
  id?: number;
  commentsLink?: string;
  selfLink?: string;
  itchMetaDataUrl?: string;
}

export interface IItchGameProfileResponse {
  found: boolean;
  itchRecord?: IItchRecord;
  message: string;
}

export interface IItchRecord {
  title?: string;
  coverImage?: string;
  authors?: { url: string; name: string }[];
  tags?: string[];
  id?: number;
  commentsLink?: string;
  selfLink?: string;
  author?: string;
  name?: string;
  domain?: string;
  itchGameUrl?: string;
  itchMetaDataUrl?: string;
}

export interface DownloadProgress {
  bytesReceived: number;
  totalBytes?: number;
  fileName?: string;
}

export type DownloadGameParams = {
  name?: string;
  author?: string;
  desiredFileName?: string;
  downloadDirectory?: string;
  /** Optional itch.io API key to use for authenticated downloads */
  apiKey?: string;
  itchGameUrl?: string;
  /** Store the downloaded file in memory instead of writing to disk */
  inMemory?: boolean;
  writeMetaData?: boolean;
  retries?: number;
  retryDelayMs?: number;
  /** Timeout in ms for Puppeteer page navigation (default: 30000) */
  navigationTimeoutMs?: number;
  /** Timeout in ms for waiting for the downloaded file to appear (default: 30000) */
  fileWaitTimeoutMs?: number;
  /** When part of an array, set to true to run downloads concurrently */
  parallel?: boolean;
  onProgress?: (info: DownloadProgress) => void;
};

export type DownloadGameResponse = {
  status: boolean;
  message: string;
  httpStatus?: number;
  metaData?: IItchRecord;
  metadataPath?: string;
  filePath?: string;
  /** Buffer containing the downloaded file when inMemory is used */
  fileBuffer?: Buffer;
};
