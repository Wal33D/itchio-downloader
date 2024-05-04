import { parseItchGameUrl } from './parseItchGameUrl';
import { parseItchGameMetadata } from './parseItchGameMetadata';
import { IParsedItchGameUrl, IParsedItchGameMetadata, IItchRecord, IItchGameProfileResponse } from './types';

export const fetchItchGameProfile = async ({
   itchGameUrl,
   author,
   name,
   domain = 'itch.io'
}: {
   itchGameUrl?: string;
   author?: string;
   name?: string;
   domain?: string;
}): Promise<IItchGameProfileResponse> => {
   if (!itchGameUrl && author && name) {
      itchGameUrl = `https://${author}.${domain}/${name}`;
   }

   if (!itchGameUrl) {
      throw new Error('Insufficient parameters: either a full URL or both author and name must be provided.');
   }

   let urlData: IParsedItchGameUrl | null = null;
   let metaData: IParsedItchGameMetadata | null = null;
   let urlError: Error | null = null;
   let metadataError: Error | null = null;

   try {
      urlData = parseItchGameUrl({ itchGameUrl });
      if (!urlData.parsed) {
         urlError = new Error('URL parsing failed: ' + urlData.message);
      }
   } catch (error: any) {
      urlError = new Error('URL parsing exception: ' + error.message);
   }

   try {
      metaData = await parseItchGameMetadata({ itchGameUrl: `${itchGameUrl}/data.json` });
      if (!metaData.jsonParsed) {
         metadataError = new Error('Metadata fetching failed: ' + metaData.message);
      }
   } catch (error: any) {
      metadataError = new Error('Metadata fetching exception: ' + error.message);
   }

   const successfulOperations = urlData && metaData ? 2 - (Number(!!urlError) + Number(!!metadataError)) : 0;
   const found = successfulOperations > 0;

   if (!found) {
      // If both operations failed
      console.error('Both URL parsing and metadata fetching failed:', urlError, metadataError);
      throw new Error('Both URL parsing and metadata fetching failed. ' + urlError?.message + ' ' + metadataError?.message);
   }

   if (!urlData || !metaData) {
      console.error('One of the parsing operations failed:', urlError?.message || metadataError?.message);
      throw new Error('One of the parsing operations failed: ' + (urlError?.message || metadataError?.message));
   }

   const itchRecord: IItchRecord = {
      title: metaData.title,
      coverImage: metaData.coverImage,
      authors: metaData.authors,
      tags: metaData.tags || [],
      id: metaData.id,
      commentsLink: metaData.commentsLink,
      selfLink: metaData.selfLink,
      author: urlData.author,
      name: urlData.name,
      domain: urlData.domain,
      itchGameUrl: itchGameUrl,
      itchMetaDataUrl: metaData.itchMetaDataUrl
   };

   return { found: true, itchRecord, message: 'Game profile fetched successfully.' };
};
