import { destroy } from './destroy'; // Assuming this is the file path
import { createDirectory } from './createDirectory';

/**
 * Resets a directory by destroying it and then recreating it.
 * This function uses the destroy and createDirectory functions to handle the operations.
 *
 * @param {string} directoryPath - The path to the directory to reset.
 * @returns {Promise<{ overallStatus: boolean; destroyStatus: boolean; createStatus: boolean; message: string }>} - Object indicating whether the reset was successful, includes a status message.
 */
export const resetDirectory = async ({
  directoryPath,
}: {
  directoryPath: string;
}): Promise<{
  reset: boolean;
  existed: boolean;
  destroyed: boolean;
  created: boolean;
  message: string;
}> => {
  let reset = false;
  let existed = false;
  let destroyed = false;
  let created = false;
  try {
    // Attempt to destroy the directory first
    destroyed = (await destroy({ pathToDestroy: directoryPath })).destroyed;

    // If destruction was successful, recreate the directory
    const createResults = await createDirectory({ directory: directoryPath });
    existed = createResults.existed;
    created = createResults.created;

    //set reset to true if destroyed and created were true or if created was true and existed was false.
    reset = (destroyed && created) || (created && !existed && !destroyed);
    return {
      reset,
      destroyed,
      created,
      existed,
      message: reset
        ? 'Directory reset successfully.'
        : 'Directory reset failed. Check individual statuses for details.',
    };
  } catch (error: unknown) {
    return {
      reset,
      destroyed,
      created,
      existed,
      message: `Error during directory reset: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};
