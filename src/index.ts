import {
  DownloadGameParams,
  DownloadGameResponse,
  IItchRecord,
  DownloadProgress,
} from './itchDownloader/types';

import { downloadGame, DownloadGameOptions } from './itchDownloader/downloadGame';
import { downloadGameDirect } from './itchDownloader/downloadGameDirect';
import { downloadGameHtml5 } from './itchDownloader/downloadGameHtml5';
import { CLIArgs } from './types/cli';

// Export the functions from this index file, making them accessible to users of your package
export {
  downloadGame,
  downloadGameDirect,
  downloadGameHtml5,
  DownloadGameParams,
  DownloadGameOptions,
  DownloadGameResponse,
  IItchRecord,
  DownloadProgress,
  CLIArgs,
};
