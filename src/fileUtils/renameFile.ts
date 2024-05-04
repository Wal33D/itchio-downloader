import fs from 'fs';
import path from 'path';
import util from 'util';

const rename = util.promisify(fs.rename);

/**
 * Renames a downloaded file with a new base name and/or extension. At least one of newBaseFileName or newBaseFileExt must be provided.
 * @param {string} filePath - The current path of the file.
 * @param {string} [newBaseFileName] - The new base name for the file without the extension.
 * @param {string} [newBaseFileExt] - The new extension for the file, without a dot (e.g., 'txt' instead of '.txt').
 * @returns {Promise<{status: boolean, message: string, newFilePath?: string}>} - Result of the rename operation.
 */
export const renameFile = async ({
   filePath,
   desiredFileName,
   desiredFileExt
}: {
   filePath: string;
   desiredFileName?: string;
   desiredFileExt?: string;
}): Promise<{ status: boolean; message: string; newFilePath?: string }> => {
   let message = '';

   if (!desiredFileName && !desiredFileExt) {
      message = 'Error: newBaseFileName or newBaseFileExt must be provided';
      return { status: false, message };
   }

   try {
      const directory = path.dirname(filePath);
      const originalBaseName = path.basename(filePath, path.extname(filePath));
      const originalExtension = path.extname(filePath);

      const finalBaseName = desiredFileName ? desiredFileName : originalBaseName;
      const finalExtension = desiredFileExt ? `.${desiredFileExt}` : originalExtension;
      const finalFileName = `${finalBaseName}${finalExtension}`;
      const newFilePath = path.join(directory, finalFileName);

      await rename(filePath, newFilePath);
      message = `File renamed to ${finalFileName}`;
      return { status: true, message, newFilePath };
   } catch (error: any) {
      message = `Failed to rename file: ${error.message}`;
      return { status: false, message };
   }
};
