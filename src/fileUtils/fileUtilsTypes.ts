export interface IVerifyFileParams {
   filePath: string;
   expectedSize?: number;
}

export interface IFileDetails {
   exists: boolean;
   size: number;
   sizeMatches?: boolean;
   name: string;
   extension: string;
   pathRelative: string;
   pathFull: string;
   isFile: boolean;
   isDirectory: boolean;
   isSymbolicLink: boolean;
   permissions: string;
   accessedAt: number;
   updatedAt: number;
   createdAt: number;
}
