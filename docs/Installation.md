# Installation

Core downloads require **Node.js 20.19+, 22.12+, or a newer supported
release**. This matches the runtime requirement of the CLI's argument parser.

## Using npm

```bash
npm install itchio-downloader

# Or install the CLI globally
npm install -g itchio-downloader
```

## Using pnpm

```bash
pnpm add itchio-downloader
```

To install globally for the CLI:

```bash
pnpm add -g itchio-downloader
```

## Using yarn

```bash
yarn add itchio-downloader
```

If you installed the package globally, you can run `itchio-downloader` right away. When installed locally, use `npx itchio-downloader` or `pnpm dlx itchio-downloader`.

## Optional browser fallback

Direct HTTP, API, and HTML5 downloads do not require Puppeteer. It is not
installed with the package by default. On Node.js 22.12 or newer, add it only
if you need the automatic last-resort browser fallback:

```bash
npm install puppeteer@^25.11.0
# or: pnpm add puppeteer@^25.11.0
# or: yarn add puppeteer@^25.11.0
```

If the downloader CLI was installed globally, install Puppeteer globally too:

```bash
npm install -g puppeteer@^25.11.0
```

Puppeteer downloads a compatible browser unless its own environment settings
tell it to use an existing Chrome or Chromium installation.

## Arch Linux (AUR)

```bash
yay -S itchio-downloader
```

For the optional browser fallback, install both the Puppeteer package and
Chromium:

```bash
yay -S puppeteer chromium
```

The downloader detects `/usr/bin/chromium` automatically. A custom browser can
be selected with `PUPPETEER_EXECUTABLE_PATH=/path/to/chromium`.
