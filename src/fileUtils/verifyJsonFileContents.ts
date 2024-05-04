import { readAndParseJsonFiles } from './readAndParseJsonFiles';

/**
 * Verifies if the provided JSON content(s) is/are contained within the specified JSON file(s).
 * Accepts a single verification request or an array of requests.
 * Returns a single object or an array of objects based on the input type.
 *
 * @param {(Array<{ filePath: string; jsonContent: object }> | { filePath: string; jsonContent: object })} requests - A single request object or an array of request objects each containing a filePath and jsonContent.
 * @returns {Promise<{ filePath: string; status: boolean; message: string } | Array<{ filePath: string; status: boolean; message: string }>>} - Either a single object or an array of objects, each indicating the success or failure of the verification along with a message describing the outcome for each file.
 */

export const verifyJsonFileContents = async (
   requests: Array<{ filePath: string; jsonContent: object }> | { filePath: string; jsonContent: object }
): Promise<{ filePath: string; status: boolean; message: string } | Array<{ filePath: string; status: boolean; message: string }>> => {
   // Normalize input to an array
   const normalizedRequests = Array.isArray(requests) ? requests : [requests];
   const isSingleRequest = !Array.isArray(requests);

   const filePaths = normalizedRequests.map((req) => req.filePath);
   const fileContents = (await readAndParseJsonFiles({ filePaths })) as any;

   const results = fileContents.map((file: { status: any; filePath: any; message: any; content: any }, index: any) => {
      if (!file.status) {
         return { filePath: file.filePath, status: false, message: file.message };
      }

      const jsonContent = normalizedRequests[index].jsonContent;
      const isContentMatching = (fileContent: { [x: string]: any; hasOwnProperty: (arg0: string) => any }, contentToVerify: any) => {
         for (let key in contentToVerify) {
            if (!fileContent.hasOwnProperty(key) || JSON.stringify(fileContent[key]) !== JSON.stringify(contentToVerify[key])) {
               return false;
            }
         }
         return true;
      };

      if (isContentMatching(file.content, jsonContent)) {
         return { filePath: file.filePath, status: true, message: 'The provided JSON content matches the file content.' };
      } else {
         return { filePath: file.filePath, status: false, message: 'The provided JSON content does not match the file content.' };
      }
   });

   // Return either a single object or an array based on the input
   return isSingleRequest ? results[0] : results;
};
