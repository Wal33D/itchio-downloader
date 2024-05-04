import fs from 'fs/promises';

/**
 * Removes a file or recursively removes a directory or file given its path.
 *
 * @param {string} pathToRemove - The path to the directory or file to be removed.
 * @returns {Promise<{ deleted: boolean; message: string }>} - Object indicating if the operation was successful and includes a status message.
 */

export async function deleteDirectoryOrFile({ directoryPath }: { directoryPath: string }): Promise<{ deleted: boolean; message: string }> {
   try {
      const stat = await fs.lstat(directoryPath);

      if (stat.isDirectory()) {
         // If it's a directory, recursively remove it
         await fs.rm(directoryPath, { recursive: true, force: true });
         return { deleted: true, message: 'Directory removed successfully.' };
      } else {
         // If it's a file, remove the file
         await fs.unlink(directoryPath);
         return { deleted: true, message: 'File removed successfully.' };
      }
   } catch (error: any) {
      return { deleted: false, message: `Failed to remove path: ${error.message}` };
   }
}
