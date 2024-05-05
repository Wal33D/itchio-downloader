import os from 'os';
import path from 'path';

import { resetDirectory } from '../fileUtils/resetDirectory';
import { createDirectory } from '../fileUtils/createDirectory';
import { createFileReadOnly } from '../fileUtils/createFileReadOnly';
import { verifyBrowserCache } from './verifyBrowserCache';
import { verifyJsonFileContents } from '../fileUtils/verifyJsonFileContents';
import { ChromeOperationResult, ChromeDirectoryOptions, ChromePreferences, ChromeLocalState } from './types';

export const setAndPrepareDownloadDirectory = async ({
   applicationName = 'DefaultApplication',
   userDataDir = path.join(os.homedir(), 'AppData', 'LocalLow', 'ItchDownloaderData'),
   downloadDirPath = path.join(os.homedir(), 'AppData', 'Local', 'ItchDownloader')
}: ChromeDirectoryOptions): Promise<ChromeOperationResult> => {
   downloadDirPath = path.join(downloadDirPath, applicationName);
   const defaultPath = path.join(userDataDir, 'Default');
   const prefsFilePath = path.join(defaultPath, 'Preferences');
   const localStateFilePath = path.join(userDataDir, 'Local State');

   // Get system user's name or use a default name if undefined or empty
   const userInfo = os.userInfo();
   const userName = userInfo.username && userInfo.username.trim() ? userInfo.username : 'A. Downloading, Human';

   let ready = false;
   let message = '';
   let modified = true;

   let localStateContent = {} as ChromeLocalState;
   let preferencesContent = {} as ChromePreferences;
   let verificationResults = {} as any;

   try {
      preferencesContent = {
         download: {
            default_directory: downloadDirPath,
            directory_upgrade: true,
            extensions_to_open: ''
         },
         savefile: {
            default_directory: downloadDirPath
         }
      };

      localStateContent = {
         profile: {
            info_cache: {
               Default: {
                  avatar_icon: 'chrome://theme/IDR_PROFILE_AVATAR_6',
                  name: userName,
                  gaia_name: userName,
                  gaia_given_name: userName,
                  user_name: `${userName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
                  shortcut_name: userName,
                  background_apps: false,
                  profile_highlight_color: -8611,
                  default_avatar_fill_color: -8611,
                  default_avatar_stroke_color: -10663424
               }
            }
         }
      };

      verificationResults = await verifyJsonFileContents([
         {
            filePath: prefsFilePath,
            jsonContent: preferencesContent
         },
         {
            filePath: localStateFilePath,
            jsonContent: localStateContent
         }
      ]);

      if (!verificationResults.every((v: { status: any }) => v.status)) {
         await resetDirectory({ directoryPath: userDataDir });
         await resetDirectory({ directoryPath: defaultPath });

         await createDirectory({ directory: downloadDirPath });

         const writeResults = (await createFileReadOnly([
            { filePath: prefsFilePath, content: JSON.stringify(preferencesContent) },
            { filePath: localStateFilePath, content: JSON.stringify(localStateContent) }
         ])) as [];

         if (!writeResults.every((result: { success: boolean }) => result.success)) {
            modified = false;
         }
      }

      ready = (await verifyBrowserCache({ downloadDirPath, prefsFilePath, localStateFilePath })).ready;
      message = 'Browser working directory and destination path set successfully.';
   } catch (error: any) {
      message = `Browser working directory and destination path setup failed: ${error.message}`;
   }

   return {
      ready,
      modified,
      userDataDir,
      downloadDirPath,
      verificationResults,
      message
   };
};

const bug = {
   status: true,
   message: 'Download and file operations successful.',
   metadataPath: 'C:\\Users\\Aquataze\\Desktop\\itchDownloader\\testOutput\\manic-miners\\manic-miners-metadata.json',
   filePath: 'C:\\Users\\Aquataze\\Desktop\\itchDownloader\\testOutput\\manic-miners\\ManicMinersV1.0.zip',
   metaData: {
      title: 'Manic Miners: A LEGO Rock Raiders remake',
      coverImage: 'https://img.itch.zone/aW1nLzEzMTQ1NzA1LnBuZw==/315x250%23c/i%2BJ4qs.png',
      authors: [[Object]],
      tags: [],
      id: 598634,
      commentsLink: 'https://baraklava.itch.io/manic-miners/comments',
      selfLink: 'https://baraklava.itch.io/manic-miners',
      author: 'baraklava',
      name: 'manic-miners',
      domain: '.itch.io',
      itchGameUrl: 'https://baraklava.itch.io/manic-miners',
      itchMetaDataUrl: 'https://baraklava.itch.io/manic-miners/data.json'
   }
};
