import path from 'path';
import os from 'os';
import fs from 'fs';
import 'dotenv/config';
import { createFile } from '../fileUtils/createFile';
import { createDirectory } from '../fileUtils/createDirectory';
import { renameFile } from '../fileUtils/renameFile';
import { fetchItchGameProfile } from './fetchItchGameProfile';
import { ItchApiClient } from './itchApiClient';
import { DownloadGameParams, DownloadGameResponse, IItchRecord } from './types';

export async function downloadGameViaApi(
  params: DownloadGameParams,
): Promise<DownloadGameResponse> {
  const {
    name,
    author,
    desiredFileName,
    downloadDirectory: inputDirectory,
    itchGameUrl: inputUrl,
    apiKey,
    inMemory,
    writeMetaData = true,
    onProgress,
  } = params;

  if (desiredFileName && (desiredFileName.includes('/') || desiredFileName.includes('\\'))) {
    return { status: false, message: 'Invalid desiredFileName: must not contain path separators.' };
  }

  const key = apiKey || process.env.ITCH_API_KEY;
  if (!key) {
    return { status: false, message: 'API key is required.' };
  }

  const downloadDirectory: string | undefined = inputDirectory
    ? path.resolve(inputDirectory)
    : inMemory
      ? undefined
      : path.resolve(os.homedir(), 'downloads');
  let itchGameUrl: string | undefined = inputUrl;

  if (!itchGameUrl && name && author) {
    itchGameUrl = `https://${author}.itch.io/${name.toLowerCase().replace(/\s+/g, '-')}`;
  }

  if (!itchGameUrl) {
    return {
      status: false,
      message: 'Invalid input: Provide either a URL or both name and author.',
    };
  }

  try {
    if (downloadDirectory) {
      await createDirectory({ directory: downloadDirectory });
    }
    const profile = await fetchItchGameProfile({ itchGameUrl });
    if (!profile.found || !profile.itchRecord?.id) {
      throw new Error('Failed to fetch game profile');
    }
    const record = profile.itchRecord as IItchRecord;
    const client = new ItchApiClient(key);
    const uploadsData = await client.get<{ uploads: { id: number; filename: string }[] }>(
      `/games/${record.id}/uploads`,
    );
    if (!uploadsData.uploads || uploadsData.uploads.length === 0) {
      throw new Error('No uploads found for game');
    }
    const upload = uploadsData.uploads[0];
    const fileName = upload.filename || `${record.name}.zip`;
    const targetPath = downloadDirectory ? path.join(downloadDirectory, fileName) : undefined;
    let fileBuffer: Buffer | undefined;

    if (inMemory) {
      fileBuffer = await client.downloadToBuffer(
        `/uploads/${upload.id}/download`,
        onProgress,
        fileName,
      );
      if (targetPath) {
        const fsPromises = await import('fs/promises');
        await fsPromises.writeFile(targetPath, fileBuffer);
      }
    } else {
      if (!targetPath) {
        throw new Error('downloadDirectory is required when not using memory mode');
      }
      await client.download(`/uploads/${upload.id}/download`, targetPath, onProgress);
    }

    let finalFilePath = targetPath || '';

    // Only do rename/dedup when downloading to disk
    if (downloadDirectory && finalFilePath) {
      const originalBase = desiredFileName || path.basename(finalFilePath, path.extname(finalFilePath));
      const ext = path.extname(finalFilePath);
      let uniqueBase = originalBase;
      let uniquePath = path.join(downloadDirectory, uniqueBase + ext);
      let counter = 1;
      while (fs.existsSync(uniquePath) && uniquePath !== finalFilePath) {
        uniqueBase = `${originalBase}-${counter}`;
        uniquePath = path.join(downloadDirectory, uniqueBase + ext);
        counter++;
      }
      if (uniqueBase !== path.basename(finalFilePath, ext) || desiredFileName) {
        const renameResult = await renameFile({ filePath: finalFilePath, desiredFileName: uniqueBase });
        if (!renameResult.status) throw new Error('File rename failed: ' + renameResult.message);
        finalFilePath = renameResult.newFilePath as string;
      }
    }

    const metadataPath = downloadDirectory
      ? path.join(downloadDirectory, `${record.name}-metadata.json`)
      : undefined;
    if (writeMetaData && metadataPath) {
      await createFile({ filePath: metadataPath, content: JSON.stringify(record, null, 2) });
    }

    return {
      status: true,
      message: 'Download successful.',
      filePath: downloadDirectory ? finalFilePath : undefined,
      metadataPath,
      metaData: record,
      fileBuffer,
    };
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    return {
      status: false,
      message: error instanceof Error ? error.message : String(error),
      httpStatus: err.statusCode as number | undefined,
    };
  }
}
