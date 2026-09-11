# Installation

This project requires **Node.js 20.19+, 22.12+, or a newer supported release**. This matches the runtime requirement of the CLI's argument parser.

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

## Arch Linux (AUR)

```bash
yay -S itchio-downloader
```

Direct HTTP and HTML5 downloads do not need a browser. For the automatic
last-resort Puppeteer fallback, also install Chromium:

```bash
sudo pacman -S chromium
```

The downloader detects `/usr/bin/chromium` automatically. A custom browser can
be selected with `PUPPETEER_EXECUTABLE_PATH=/path/to/chromium`.
