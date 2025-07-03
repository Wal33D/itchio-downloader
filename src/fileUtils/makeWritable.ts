import fs from 'fs/promises';
import path from 'path';

/**
 * Recursively makes all files and directories within the specified directory writable.
 * This includes checking if the directory exists before attempting modifications.
 *
 * @param {string} dirPath - The path of the directory to modify.
 * @returns {Promise<{ exists: boolean; writable: boolean; message: string }>} - Result indicating existence, success or failure of operation.
 */
export const makeWritable = async ({
  dirPath,
}: {
  dirPath: string;
}): Promise<{ exists: boolean; writable: boolean; message: string }> => {
  let exists = true; // Default to true; will update if access fails
  let writable = true; // Assume writable until proven otherwise

  try {
    await fs.access(dirPath); // Check if the file or directory exists
    const stat = await fs.stat(dirPath);

    if (stat.isDirectory()) {
      await fs.chmod(dirPath, 0o777); // Make directory writable
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const fileStat = await fs.stat(filePath);
        if (fileStat.isDirectory()) {
          const result = await makeWritable({ dirPath: filePath });
          if (!result.writable) {
            writable = false; // Update writable based on recursive call
            throw new Error(
              `Failed to make subdirectory writable: ${filePath}, Reason: ${result.message}`,
            );
          }
        } else {
          await fs.chmod(filePath, 0o666); // Make file writable
        }
      }
    } else {
      await fs.chmod(dirPath, 0o666); // Make file writable if it's not a directory
    }
  } catch (error: any) {
    exists = error.code !== 'ENOENT'; // Update exists based on specific error code
    writable = false; // Set writable to false if any error occurs
    return {
      exists,
      writable,
      message: `Failed to make writable: ${dirPath}, Reason: ${error.message}`,
    };
  }

  return {
    exists,
    writable,
    message: `All files and directories at ${dirPath} made writable.`,
  };
};
