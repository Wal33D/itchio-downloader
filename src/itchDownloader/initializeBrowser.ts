import puppeteer, { Browser } from 'puppeteer';

export const initializeBrowser = async ({
   userDataDir,
   headless = true
}: {
   userDataDir: string;
   headless?: boolean;
}): Promise<{ browser: Browser | null; status: boolean; message: string }> => {
   let message = '';
   let status = false;
   let browser: Browser | null = null;

   try {
      browser = await puppeteer.launch({
         headless: headless, // Set to false for visual debugging or true for production
         defaultViewport: null, // Use the default screen size of the system
         userDataDir,
         args: [
            '--window-size=1920,1080', // Set window size
            '--disable-features=IsolateOrigins,site-per-process', // Disables some security features for better automation compatibility
            '--disable-blink-features=AutomationControlled', // Removes the flag that Puppeteer is controlling the browser
            '--no-sandbox', // Disable the sandbox for simplicity (consider the security implications for production)
            '--disable-setuid-sandbox' // Additional sandbox disabling
         ]
      });

      // Create a new page in the browser
      const page = await browser.newPage();

      // Set a custom user agent and additional headers
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setExtraHTTPHeaders({
         'Accept-Language': 'en-US,en;q=0.9' // Setting language preferences
      });

      // More settings to mimic a real user browser
      // Remove the WebDriver flag which can be detected
      await page.evaluateOnNewDocument(() => {
         Object.defineProperty(navigator, 'webdriver', {
            get: () => false
         });
      });

      status = true;
      message = 'Browser initialized successfully with enhanced settings.';
   } catch (error: any) {
      message = `Failed to initialize browser: ${error.message}`;
      browser = null;
   }

   return { browser, status, message };
};
