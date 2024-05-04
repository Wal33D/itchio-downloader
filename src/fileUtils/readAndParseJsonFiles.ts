import fs from 'fs/promises';

/**
 * Reads and parses the contents of one or more JSON files specified by their paths.
 * This function handles both a single file path and an array of file paths.
 * It uses Promise.allSettled to perform concurrent reading and parsing operations efficiently and safely.
 * If a single file path is provided, it returns a single object instead of an array.
 *
 * @param {string | string[]} filePaths - A single file path or an array of file paths of JSON files to read and parse.
 * @returns {Promise<{ filePath: string; content: any | null; status: boolean; message: string } | { filePath: string; content: any | null; status: boolean; message: string }[]>} - Either a single object or an array of objects, each containing the file path, status of the read and parse operation, parsed content (or null if an error occurred), and a status message.
 */

export const readAndParseJsonFiles = async ({
   filePaths
}: {
   filePaths: string | string[];
}): Promise<
   { filePath: string; content: any | null; status: boolean; message: string } | { filePath: string; content: any | null; status: boolean; message: string }[]
> => {
   // Ensure filePaths is always an array
   const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
   const isSinglePath = !Array.isArray(filePaths);

   const readPromises = paths.map((filePath) =>
      fs
         .readFile(filePath, 'utf8')
         .then((fileContent) => {
            const parsedContent = JSON.parse(fileContent); // Parse the JSON content
            return {
               filePath,
               status: true,
               content: parsedContent,
               message: 'JSON file read and parsed successfully.'
            };
         })
         .catch((error) => ({
            filePath,
            status: false,
            content: null,
            message: `Failed to read or parse JSON file: ${error.message}`
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
            status: false,
            content: null,
            message: result.reason.message || 'An unexpected error occurred'
         };
      }
   });

   // Return either a single object or an array based on the input
   return isSinglePath ? formattedResults[0] : formattedResults;
};
