import {
  DownloadGameParams,
  DownloadGameResponse,
  IItchRecord,
  DownloadProgress,
} from './itchDownloader/types';

import { downloadGame } from './itchDownloader/downloadGame';
import { CLIArgs } from './types/cli';

// Export the functions from this index file, making them accessible to users of your package
export {
  downloadGame,
  DownloadGameParams,
  DownloadGameResponse,
  IItchRecord,
  DownloadProgress,
  CLIArgs,
};
