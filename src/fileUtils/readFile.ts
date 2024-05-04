import fs from 'fs/promises';

/**
 * Reads the contents of one or more files specified by their paths.
 * This function handles both a single file path and an array of file paths.
 * It uses Promise.allSettled to perform concurrent reading operations efficiently and safely.
 *
 * @param {string | string[]} filePaths - A single file path or an array of file paths to read.
 * @returns {Promise<{ filePath: string; content: string | null; read: boolean; message: string }[] | { filePath: string; content: string | null; read: boolean; message: string }>} - Depending on the input, returns either an array of objects or a single object, each containing the file path, read status, content (or null if an error occurred), and a status message.
 */

export const readFile = async ({
   filePaths
}: {
   filePaths: string | string[];
}): Promise<
   { filePath: string; content: string | null; read: boolean; message: string } | { filePath: string; content: string | null; read: boolean; message: string }[]
> => {
   // Ensure filePaths is always an array
   const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
   const isSinglePath = !Array.isArray(filePaths);

   const readPromises = paths.map((filePath) =>
      fs
         .readFile(filePath, 'utf8')
         .then((content) => ({
            filePath,
            read: true,
            content,
            message: 'File read successfully.'
         }))
         .catch((error) => ({
            filePath,
            read: false,
            content: null,
            message: `Failed to read file: ${error.message}`
         }))
   );

   // Wait for all read operations to complete, handling each one's success or failure
   const results = await Promise.allSettled(readPromises);

   // Map results to format the final output as required
   const formattedResults = results.map((result) => {
      if (result.status === 'fulfilled') {
         return result.value;
      } else {
         // For any unexpected error in the handling code itself, though this should ideally never be triggered
         return {
            filePath: result.reason.filePath || 'Unknown file',
            read: false,
            content: null,
            message: result.reason.message || 'An unexpected error occurred'
         };
      }
   });

   // Return either an array or a single object based on the input
   return isSinglePath ? formattedResults[0] : formattedResults;
};
