import fs from 'fs';
import path from 'path';
import util from 'util';

const readdir = util.promisify(fs.readdir);
const access = util.promisify(fs.access);

/**
 * Waits for a `.crdownload` file in the specified directory to disappear, indicating the download has finished, and then captures the renamed file.
 * Ignores `.temp` files and any `.crdownload` files already present at invocation.
 * @param {{ downloadDirectory: string }} params - Object containing the directory to monitor for downloads.
 * @returns {Promise<{status: boolean, message: string, filePath?: string}>} - Resolves with status, message, and the path of the completed file.
 */
export async function waitForFile({ downloadDirectory }: { downloadDirectory: string }): Promise<{ status: boolean; message: string; filePath?: string }> {
   let message = 'Monitoring for file changes...';

   // Get initial list of `.crdownload` files to ignore.
   const initialFiles = new Set(
      (await readdir(downloadDirectory)).filter((file) => file.endsWith('.crdownload')).map((file) => path.join(downloadDirectory, file))
   );

   const checkFileExistence = async (filePath: string) => {
      try {
         await access(filePath, fs.constants.F_OK);
         return true; // File still exists
      } catch (error: any) {
         if (error.code === 'ENOENT') {
            return false; // File does not exist
         }
         throw error; // Re-throw unexpected errors
      }
   };

   return new Promise<{ status: boolean; message: string; filePath?: string }>((resolve, reject) => {
      const watcher = fs.watch(downloadDirectory, async (eventType, filename) => {
         if (!filename || filename.endsWith('.temp') || filename.endsWith('.tmp')) return; // Ignore non-files and `.temp` files

         const fullPath = path.join(downloadDirectory, filename);

         if (filename.endsWith('.crdownload')) {
            if (initialFiles.has(fullPath)) {
               return; // Ignore already existing `.crdownload` files
            }

            // Continue to monitor for the disappearance of the `.crdownload` file.
            try {
               const exists = await checkFileExistence(fullPath);
               if (!exists) {
                  // Once `.crdownload` disappears, wait for next file creation.
                  message = 'Waiting for the final file to appear...';
               }
            } catch (error: any) {
               watcher.close();
               reject({ status: false, message: `Error monitoring file: ${error.message}` });
            }
         } else if (!initialFiles.has(fullPath) && eventType === 'rename') {
            // Assume the file appearing after a `.crdownload` disappears is the completed file.
            watcher.close();
            resolve({ status: true, message: `Download complete: ${filename}`, filePath: fullPath });
         }
      });
   });
}
