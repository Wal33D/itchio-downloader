export interface PuppeteerResponse {
  status(): number;
}

export interface PuppeteerCdpSession {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
}

export interface PuppeteerPage {
  setViewport(viewport: { width: number; height: number }): Promise<void>;
  setUserAgent(userAgent: string): Promise<void>;
  setExtraHTTPHeaders(headers: Record<string, string>): Promise<void>;
  evaluateOnNewDocument(pageFunction: () => void): Promise<unknown>;
  createCDPSession(): Promise<PuppeteerCdpSession>;
  goto(
    url: string,
    options: { waitUntil: string; timeout: number },
  ): Promise<PuppeteerResponse | null>;
  waitForSelector(
    selector: string,
    options?: { timeout?: number },
  ): Promise<unknown>;
  click(selector: string): Promise<void>;
  $(selector: string): Promise<unknown | null>;
}

export interface PuppeteerBrowser {
  newPage(): Promise<PuppeteerPage>;
  close(): Promise<void>;
}

interface PuppeteerModule {
  default: {
    launch(options?: {
      headless?: boolean;
      defaultViewport?: null;
      args?: string[];
      executablePath?: string;
    }): Promise<PuppeteerBrowser>;
  };
}

export async function loadPuppeteer(
  packageName = 'puppeteer',
): Promise<PuppeteerModule | null> {
  try {
    // Keep the package name indirect so TypeScript does not require this
    // separately installed fallback to build the core downloader.
    return (await import(packageName)) as PuppeteerModule;
  } catch {
    return null;
  }
}
