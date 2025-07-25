export interface ChromeProfileInfo {
  active_time: number;
  avatar_icon: string;
  name: string;
  gaia_id: string;
  user_name: string;
  is_consented_primary_account: boolean;
}

export interface ChromeProfileInfoCache {
  [profileKey: string]: ChromeProfileInfo | any;
}

export interface ChromeProfile {
  info_cache: ChromeProfileInfoCache;
}

export interface ChromeLocalState {
  profile: ChromeProfile;
}

export interface ChromeConfig {
  default_directory: string;
  directory_upgrade?: boolean;
  extensions_to_open?: string;
  prompt_for_download?: boolean;
}

export interface ChromePreferences {
  download: ChromeConfig;
  savefile: ChromeConfig;
}

export interface ChromeOperationResult {
  ready: boolean;
  message: string;
  modified: boolean;
  userDataDir: string;
  downloadDirPath: string;
  verificationResults: any;
}

export interface ChromeDirectoryOptions {
  applicationName?: string;
  userDataDir?: string;
  downloadDirPath?: string;
}

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
