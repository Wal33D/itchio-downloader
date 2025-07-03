import fs from 'fs/promises';
import path from 'path';
import { verifyFile } from './verifyFile';

/**
 * Creates a file with read-only permissions. Accepts a single file creation request or an array of requests.
 * Returns a single object or an array of objects based on the input type.
 *
 * @param {(Array<{ filePath: string; content: string; writeOptions?: object }> | { filePath: string; content: string; writeOptions?: object })} requests - A single request or an array of requests for file creation.
 * @returns {Promise<{ filePath: string; created: boolean; writable: boolean; isFile: boolean; isDirectory: boolean; exists: boolean; existed: boolean; overwritten: boolean; hasParentDirectory: boolean; message: string } | Array<{ filePath: string; created: boolean; writable: boolean; isFile: boolean; isDirectory: boolean; exists: boolean; existed: boolean; overwritten: boolean; hasParentDirectory: boolean; message: string }>>} - Either a single object or an array of objects, each indicating the status and outcome of the file creation.
 */
export const createFileReadOnly = async (
  requests:
    | Array<{ filePath: string; content: string; writeOptions?: object }>
    | { filePath: string; content: string; writeOptions?: object },
): Promise<
  | {
      filePath: string;
      created: boolean;
      writable: boolean;
      isFile: boolean;
      isDirectory: boolean;
      exists: boolean;
      existed: boolean;
      overwritten: boolean;
      hasParentDirectory: boolean;
      message: string;
    }
  | Array<{
      filePath: string;
      created: boolean;
      writable: boolean;
      isFile: boolean;
      isDirectory: boolean;
      exists: boolean;
      existed: boolean;
      overwritten: boolean;
      hasParentDirectory: boolean;
      message: string;
    }>
> => {
  // Normalize input to an array
  const normalizedRequests = Array.isArray(requests) ? requests : [requests];
  const isSingleRequest = !Array.isArray(requests);

  const results = await Promise.all(
    normalizedRequests.map(async (request) => {
      const { filePath, content, writeOptions } = request;
      const verification = await verifyFile({ filePath });
      const mode = 0o444; // Read-only permissions

      if (verification.isDirectory) {
        throw new Error(
          `Operation aborted: The target '${filePath}' is a directory, and content cannot be written as if it were a file.`,
        );
      }

      const parentDir = path.dirname(filePath);
      const hasParentDirectory = !!(
        parentDir &&
        parentDir !== '.' &&
        parentDir !== '/'
      );

      try {
        await fs.writeFile(filePath, content, {
          encoding: 'utf8',
          mode,
          ...writeOptions,
        });
        const exists = true;
        const created = true;
        const existed = verification.exists;
        const overwritten = existed && verification.isFile;
        const writable = false; // File is read-only

        let message = `File '${filePath}' has been ${created ? 'created' : 'not created'} and set to read-only.`;
        if (overwritten) {
          message += ` The file was overwritten as it already existed.`;
        }

        // Change permissions if the file already existed
        if (existed) {
          await fs.chmod(filePath, mode);
          message += ` Permissions were enforced to read-only.`;
        }

        return {
          filePath,
          created,
          writable,
          isFile: verification.isFile,
          isDirectory: verification.isDirectory,
          exists,
          existed,
          overwritten,
          hasParentDirectory,
          message,
        };
      } catch (error: any) {
        throw new Error(
          `Failed to write to the file '${filePath}' due to: ${error.message}`,
        );
      }
    }),
  );

  // Return either a single object or an array based on the input
  return isSingleRequest ? results[0] : results;
};
