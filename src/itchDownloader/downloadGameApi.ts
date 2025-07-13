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
    writeMetaData = true,
    onProgress,
  } = params;

  const key = apiKey || process.env.ITCH_API_KEY;
  if (!key) {
    return { status: false, message: 'API key is required.' };
  }

  let downloadDirectory: string = inputDirectory
    ? path.resolve(inputDirectory)
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
    await createDirectory({ directory: downloadDirectory });
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
    const targetPath = path.join(downloadDirectory, fileName);

    await client.download(`/uploads/${upload.id}/download`, targetPath, onProgress);

    let finalFilePath = targetPath;
    const originalBase = desiredFileName ? desiredFileName : path.basename(finalFilePath, path.extname(finalFilePath));
    const ext = path.extname(finalFilePath);
    let uniqueBase = originalBase;
    let uniquePath = path.join(downloadDirectory, uniqueBase + ext);
    let counter = 1;
    while (fs.existsSync(uniquePath)) {
      uniqueBase = `${originalBase}-${counter}`;
      uniquePath = path.join(downloadDirectory, uniqueBase + ext);
      counter++;
    }
    if (uniquePath !== finalFilePath || desiredFileName) {
      const renameResult = await renameFile({ filePath: finalFilePath, desiredFileName: uniqueBase });
      if (!renameResult.status) throw new Error('File rename failed: ' + renameResult.message);
      finalFilePath = renameResult.newFilePath as string;
    }

    const metadataPath = path.join(downloadDirectory, `${record.name}-metadata.json`);
    if (writeMetaData) {
      await createFile({ filePath: metadataPath, content: JSON.stringify(record, null, 2) });
    }

    return { status: true, message: 'Download successful.', filePath: finalFilePath, metadataPath, metaData: record };
  } catch (error: any) {
    return { status: false, message: error.message, httpStatus: error.statusCode };
  }
}
