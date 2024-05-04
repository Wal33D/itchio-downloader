import fs from 'fs/promises';

/**
 * Asynchronously creates a directory if it does not already exist. Handles special cases like directories ending with '.0'.
 * @param {string} directory - The path to the directory to create.
 * @returns {Promise<{created: boolean, existed: boolean}>} - A promise that resolves with an object indicating whether the directory was created and if it existed beforehand.
 */

export async function createDirectory({ directory }: { directory: string }): Promise<{ created: boolean; existed: boolean }> {
   let existed = false;
   try {
      // Handle directories ending with '.0' by appending an underscore temporarily
      const temporaryDirectory = directory.endsWith('.0') ? `${directory}_` : directory;

      try {
         await fs.access(temporaryDirectory);
         existed = true; // Directory already exists
      } catch {
         // If the directory does not exist, create it
         await fs.mkdir(temporaryDirectory, { recursive: true });
      }

      // If a temporary directory was created (with an underscore), rename it to the intended name
      if (temporaryDirectory !== directory && !existed) {
         await fs.rename(temporaryDirectory, directory);
      }

      return { created: !existed, existed };
   } catch (error) {
      console.error(`Failed to create/detect directory '${directory}':`, error);
      return { created: false, existed };
   }
}
