import { verifyFile } from '../fileUtils/verifyFile';

/**
 * Verifies the necessary file properties and permissions for given file paths.
 *
 * @param {string} downloadDirPath - Path to the download directory.
 * @param {string} prefsFilePath - Path to the preferences file.
 * @param {string} localStateFilePath - Path to the local state file.
 * @returns {Promise<{ready: boolean, message: string}>} - Indicates if all checks are satisfied and includes a message.
 */
export const verifyBrowserCache = async ({
   downloadDirPath,
   prefsFilePath,
   localStateFilePath
}: {
   downloadDirPath: string;
   prefsFilePath: string;
   localStateFilePath: string;
}): Promise<{ ready: boolean; message: string }> => {
   let message = '';
   try {
      const downloadDirCheck = await verifyFile({ filePath: downloadDirPath });
      const prefsFileCheck = await verifyFile({ filePath: prefsFilePath });
      const localStateFileCheck = await verifyFile({ filePath: localStateFilePath });

      // Check if the directory is writable
      const downloadDirReady = downloadDirCheck.isDirectory && /[0-7]{3}6/.test(downloadDirCheck.permissions);
      // Check if the files are not writable
      const prefsFileReady = prefsFileCheck.isFile && !/2/.test(prefsFileCheck.permissions.charAt(prefsFileCheck.permissions.length - 1));
      const localStateFileReady = localStateFileCheck.isFile && !/2/.test(localStateFileCheck.permissions.charAt(localStateFileCheck.permissions.length - 1));

      const ready = downloadDirReady && prefsFileReady && localStateFileReady;

      if (!ready) {
         message = 'One or more verifications failed: Check directory and file permissions.';
         return { ready, message };
      }

      message = 'All verifications passed successfully.';
      return { ready, message };
   } catch (error: any) {
      message = `Verification error: ${error.message}`;
      return { ready: false, message };
   }
};
