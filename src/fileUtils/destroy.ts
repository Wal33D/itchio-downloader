import fs from 'fs/promises';
import { makeWritable } from './makeWritable';
import { clearDirectory } from './clearDirectory';
import { deleteDirectoryOrFile } from './deleteDirectoryOrFile';

/**
 * Completely destroys a file or directory along with its contents.
 * The process involves making the directory or file writable, clearing its contents if it is a directory,
 * and then removing the file or directory itself.
 * Returns an object indicating the overall success of these operations, along with a status message.
 *
 * @param {string} pathToDestroy - The path to the file or directory to be destroyed.
 * @returns {Promise<{ overallStatus: boolean; writableStatus: boolean; clearStatus: boolean; removeStatus: boolean; message: string }>} - Object indicating whether the operation was successful, includes a status message.
 */

export async function destroy({ pathToDestroy }: { pathToDestroy: string }): Promise<{
   destroyed: boolean;
   writableStatus: boolean;
   clearStatus: boolean;
   deleteStatus: boolean;
   path: string;
   message: string;
}> {
   let writableStatus = false;
   let clearStatus = false;
   let deleteStatus = false;
   let destroyed = true;
   try {
      // Make the directory or file writable
      writableStatus = (await makeWritable({ dirPath: pathToDestroy })).writable;

      const stat = await fs.lstat(pathToDestroy);

      if (stat.isDirectory()) {
         // First, clear the directory contents recursively
         clearStatus = (await clearDirectory({ directoryPath: pathToDestroy })).clean;
         // Now, remove the directory itself
         deleteStatus = (await deleteDirectoryOrFile({ directoryPath: pathToDestroy })).deleted;
      } else {
         // It's a file, so just remove it
         deleteStatus = (await deleteDirectoryOrFile({ directoryPath: pathToDestroy })).deleted;
      }

      destroyed = writableStatus && clearStatus && deleteStatus;

      return {
         destroyed,
         writableStatus,
         clearStatus,
         deleteStatus,
         path: pathToDestroy,
         message: destroyed ? 'Destruction completed successfully.' : 'Destruction failed. Some components could not be removed.'
      };
   } catch (error: any) {
      return {
         destroyed: writableStatus && clearStatus && deleteStatus,
         writableStatus,
         clearStatus,
         deleteStatus,
         path: pathToDestroy,
         message: `Error during destruction of ${pathToDestroy}: ${error.message}`
      };
   }
}
