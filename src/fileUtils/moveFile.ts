import fs from 'fs';
import path from 'path';
import util from 'util';

const mkdir = util.promisify(fs.mkdir);
const rename = util.promisify(fs.rename);

/**
 * Moves a file to a specified directory, ensuring the directory exists.
 * @param {string} sourcePath - The current path of the file.
 * @param {string} targetDirectory - The directory to move the file to.
 * @returns {Promise<{status: boolean, message: string, newPath?: string}>} - Result of the move operation.
 */
export const moveFile = async ({ sourcePath, targetDirectory }: { sourcePath: string; targetDirectory: string }): Promise<{ status: boolean; message: string; newPath?: string }> => {
   let message = '';
   try {
      // Ensure the target directory exists
      await mkdir(targetDirectory, { recursive: true });

      const fileName = path.basename(sourcePath);
      const targetPath = path.join(targetDirectory, fileName);

      // Move the file
      await rename(sourcePath, targetPath);
      message = `File moved successfully to ${targetPath}`;
      return { status: true, message, newPath: targetPath };
   } catch (error: any) {
      message = `Failed to move file: ${error.message}`;
      return { status: false, message };
   }
};
