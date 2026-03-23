import fs from 'fs/promises';
import path from 'path';

/**
 * Renames a file with a new base name and/or extension.
 * Uses fs.rename which is atomic on the same filesystem — no need for
 * separate delete of the original file.
 */
export const renameFile = async ({
  filePath,
  desiredFileName,
  desiredFileExt,
}: {
  filePath: string;
  desiredFileName?: string;
  desiredFileExt?: string;
}): Promise<{ status: boolean; message: string; newFilePath?: string }> => {
  if (!desiredFileName && !desiredFileExt) {
    return {
      status: false,
      message: 'Error: desiredFileName or desiredFileExt must be provided',
    };
  }

  try {
    const directory = path.dirname(filePath);
    const originalBaseName = path.basename(filePath, path.extname(filePath));
    const originalExtension = path.extname(filePath);

    const finalBaseName = desiredFileName || originalBaseName;
    const finalExtension = desiredFileExt
      ? `.${desiredFileExt}`
      : originalExtension;
    const finalFileName = `${finalBaseName}${finalExtension}`;
    const newFilePath = path.join(directory, finalFileName);

    // fs.rename is atomic on the same filesystem — the original path
    // ceases to exist as part of the rename operation.
    await fs.rename(filePath, newFilePath);

    return {
      status: true,
      message: `File renamed to ${finalFileName}`,
      newFilePath,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown rename error';
    return { status: false, message: `Failed to rename file: ${message}` };
  }
};
