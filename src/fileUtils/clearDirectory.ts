import fs from 'fs/promises';
import path from 'path';

/**
 * Recursively clears all files and subdirectories in the specified directory.
 *
 * @param {string} directory - The path of the directory to clear.
 * @returns {Promise<{ clean: boolean, message: string }>} - Object indicating if the directory was successfully cleared and includes a status message.
 */

export async function clearDirectory({ directoryPath }: { directoryPath: string }): Promise<{ clean: boolean; message: string }> {
   try {
      // Check if the directory exists
      try {
         await fs.access(directoryPath);
      } catch {
         // If the directory does not exist, create it and return success
         await fs.mkdir(directoryPath, { recursive: true });
         return { clean: true, message: 'Directory was created as it did not exist.' };
      }

      // Read the contents of the directory
      const files = await fs.readdir(directoryPath);

      // Iterate over each file/subdirectory and delete appropriately
      for (const file of files) {
         const curPath = path.join(directoryPath, file);
         const stat = await fs.lstat(curPath);

         if (stat.isDirectory()) {
            // Recursively clear subdirectories
            const result = await clearDirectory({ directoryPath: curPath });
            if (!result.clean) {
               // Propagate the first encountered error
               throw new Error(result.message);
            }
            // Remove the directory after clearing it
            await fs.rmdir(curPath);
         } else {
            // Remove files directly
            await fs.unlink(curPath);
         }
      }

      return { clean: true, message: 'Directory and all contents successfully cleared.' };
   } catch (error: any) {
      return { clean: false, message: `Failed to clear directory: ${error.message}` };
   }
}
