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

export type DownloadGameParams = {
   name?: string;
   author?: string;
   desiredFileName?: string;
   downloadDirectory?: string;
   itchGameUrl?: string;
};

export type DownloadGameResponse = {
   status: boolean;
   message: string;
   metaData?: IItchRecord;
   metadataPath?: string;
   filePath?: string;
};
