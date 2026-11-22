# Everyday Tools — Web app

A small, static browser app with a restrained interface. File processing happens on-device in the browser.

## Requirements

- Node.js 22.12 or newer
- npm (included with Node.js)

## Commands

From this directory:

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
npm run test:e2e
```

The `predev` step copies PDF.js support files into the ignored `public/pdfjs/` folder so the development preview uses the same local support data as the production build. `npm run build` builds the Vite app, copies PDF.js support files into `dist/pdfjs/`, and generates a fingerprinted service worker which precaches the complete static app and PDF renderer assets.

For a GitHub Pages build:

```sh
GITHUB_PAGES=true npm run build
```

On Windows PowerShell:

```powershell
$env:GITHUB_PAGES = "true"
npm run build
```

## Local-only behavior

The file-processing functions receive browser `File` objects and use browser APIs/libraries directly. They do not call a server or upload the selected source files. Only normal requests to the GitHub Pages host are made to load the static website.

The service worker caches the app files after first load. It only handles same-origin GET requests under the app path. It does not intercept or cache selected files or generated downloads.

## UI and accessibility

- Plain light theme, simple tabs, conventional form controls and clear result/error states.
- Keyboard-visible focus states and reduced-motion support.
- Native dialog and progress elements with labels.
- Automated axe checks, mobile viewport checks and Playwright interaction tests.

## Limits

- 100 MB total input; 50 MB per PDF; 20 MB per image.
- 16 megapixels per image.
- 20 files per batch; no more than 12 PDFs in a merge.
- Up to 250 pages for PDF operations; rendering has a 100-page cap.
- 100 MB total generated PDF or ZIP output.
- 2 million characters per text input.

These are conservative checks, not guaranteed memory budgets. A browser or device may run out of memory earlier.

## Known PDF caveats

- Password-protected PDFs are rejected.
- Page-copying/rewriting can lose bookmarks, attachments, form fields or annotations.
- A modified PDF no longer has a valid original digital signature.
- OCR, editing text already inside a PDF, signatures, annotation editing and form filling are not implemented.

## Distribution

GitHub Pages is the current free static hosting choice because the source repository is public. The repository's `.github/workflows/pages.yml` builds and deploys the static site. Enable GitHub Pages with **Settings → Pages → Source → GitHub Actions**.

The site is not considered published until GitHub reports a successful Pages deployment. The intended site address is `https://gaurav01mh.github.io/everyday-tools-python/`.
