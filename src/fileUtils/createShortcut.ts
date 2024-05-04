import * as ws from 'windows-shortcuts';
import * as fs from 'fs/promises';
import * as path from 'path';

export const createShortcut = async ({
   startPath,
   name,
   type,
   options
}: {
   startPath: string;
   name: string;
   type: 'file' | 'url' | 'directory';
   options: { target: string; desc?: string; icon?: string; workingDir?: string };
}): Promise<{ created: boolean; message: string }> => {
   const shortcutExtension = type === 'url' ? 'url' : 'lnk';
   const shortcutPath = path.join(startPath, `${name}.${shortcutExtension}`);
   let created = false;
   let message = '';

   try {
      if (type === 'file' || type === 'directory') {
         // Handle file and directory shortcut creation
         await new Promise<void>((resolve, reject) => {
            let shortcutOptions = { ...options };
            if (type === 'directory') {
               // Ensure the working directory is set correctly for directory shortcuts
               shortcutOptions.workingDir = shortcutOptions.workingDir || options.target;
            }
            ws.create(shortcutPath, shortcutOptions, (err: any) => {
               if (err) reject(new Error(`Failed to create ${type} shortcut: ${err.message}`));
               else resolve();
            });
         });
         message = `${type.charAt(0).toUpperCase() + type.slice(1)} shortcut created successfully at ${shortcutPath}`;
      } else if (type === 'url') {
         // Handle URL shortcut creation
         const shortcutContent = `[InternetShortcut]\r\nURL=${options.target}\r\n`;
         await fs.writeFile(shortcutPath, shortcutContent);
         message = `URL shortcut created successfully at ${shortcutPath}`;
      }
      created = true;
   } catch (error: any) {
      message = `Error creating ${type} shortcut at ${shortcutPath}: ${error.message}`;
   }

   return { created, message };
};
