import fs from 'fs';
import os from 'os';
import path from 'path';
import util from 'util';

const lockFilePath = path.join(os.homedir(), 'AppData', 'LocalLow', 'ItchDownloadLock.lock');

const fsWriteFile = util.promisify(fs.writeFile);
const fsUnlink = util.promisify(fs.unlink);
const fsAccess = util.promisify(fs.access);

// Helper functions to handle the lock file
export const acquireLock = async () => {
   try {
      await fsWriteFile(lockFilePath, 'locked');
   } catch (error: any) {
      throw new Error('Failed to acquire lock: ' + error.message);
   }
};

export const releaseLock = async () => {
   try {
      await fsUnlink(lockFilePath);
   } catch (error: any) {
      console.error('Failed to release lock:', error.message);
   }
};

export const isLocked = async () => {
   try {
      await fsAccess(lockFilePath);
      return true;
   } catch (error) {
      return false;
   }
};
