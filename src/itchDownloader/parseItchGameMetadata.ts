import fetch from 'node-fetch';
import { IParsedItchGameMetadata } from './types';

/**
 * Fetches and parses game metadata from an Itch.io JSON file.
 * @param {object} params - Parameters that can include a direct URL or author and game name.
 * @returns {Promise<IParsedItchGameMetadata>} - The parsed metadata object.
 */
export const parseItchGameMetadata = async ({
   itchGameUrl,
   author,
   name,
   domain = 'itch.io'
}: {
   itchGameUrl?: string;
   author?: string;
   name?: string;
   domain?: string;
}): Promise<IParsedItchGameMetadata> => {
   if (!itchGameUrl && author && name) {
      itchGameUrl = `https://${author}.${domain}/${name}/data.json`;
   }

   if (!itchGameUrl || !itchGameUrl.includes('.itch.io/') || !itchGameUrl.endsWith('.json')) {
      return {
         jsonParsed: false,
         message: 'Invalid URL format. URL must be an Itch.io JSON file.'
      };
   }

   try {
      const response = await fetch(itchGameUrl);
      if (!response.ok) {
         throw new Error(`HTTP error! jsonParsed: ${response.status}`);
      }
      const json = await response.json();

      if (!json.title || !json.cover_image || !json.authors || !json.links) {
         throw new Error('JSON structure is incomplete or incorrect.');
      }

      const metadata: IParsedItchGameMetadata = {
         jsonParsed: true,
         message: 'Metadata fetched successfully.',
         title: json.title,
         coverImage: json.cover_image,
         authors: json.authors,
         tags: json.tags || [],
         id: json.id,
         commentsLink: json.links.comments,
         selfLink: json.links.self,
         itchMetaDataUrl: itchGameUrl
      };
      return metadata;
   } catch (error: any) {
      return {
         jsonParsed: false,
         message: `Failed to fetch or parse metadata: ${error.message}`
      };
   }
};
