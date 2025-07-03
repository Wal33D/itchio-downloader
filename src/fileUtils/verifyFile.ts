import fs from 'fs/promises';
import path from 'path';
import { IFileDetails, IVerifyFileParams } from './fileUtilsTypes';

/**
 * Checks if a file exists, and if a size is specified, also checks if the file matches the expected size.
 * It returns detailed file information along with an operation status indicator.
 *
 * @param {IVerifyFileParams} params - The parameters for the function.
 * @returns {Promise<IFileDetails>} - The result object with detailed file information and a status message.
 */

export const verifyFile = async (
  params: IVerifyFileParams,
): Promise<IFileDetails> => {
  const { filePath, expectedSize } = params;

  let exists = false;
  let sizeMatches = false;
  let isFile = false;
  let isDirectory = false;
  let isSymbolicLink = false;
  let size = 0;
  let createdAt = 0;
  let updatedAt = 0;
  let accessedAt = 0;
  let name = path.basename(filePath);
  let extension = path.extname(filePath);
  let pathFull = path.resolve(filePath);
  let pathRelative = path.relative(process.cwd(), pathFull);
  let permissions = '';

  try {
    const stats = await fs.lstat(pathFull);
    // Set true as file stats are successfully fetched
    exists = true;
    size = stats.size;
    isFile = stats.isFile();
    isDirectory = stats.isDirectory();
    isSymbolicLink = stats.isSymbolicLink();
    permissions = `0${(stats.mode & parseInt('777', 8)).toString(8)}`;
    sizeMatches = expectedSize !== undefined ? size === expectedSize : false;
    accessedAt = stats.atimeMs;
    updatedAt = stats.ctimeMs;
    createdAt = stats.birthtimeMs;
  } catch (error: any) {
    // Set false as the file does not exist or error occurred
    exists = false;
  }

  return {
    exists,
    size,
    sizeMatches,
    name,
    extension,
    pathRelative,
    pathFull,
    isFile,
    isDirectory,
    isSymbolicLink,
    permissions,
    accessedAt,
    updatedAt,
    createdAt,
  };
};
