# Everyday Tools

A simple, free, local-first browser toolbox for everyday PDF, image, text and data tasks.

The website is a static app. It has no account, ads, AI API, analytics, backend, or file-upload service. The selected files are processed on the visitor's own device in the browser.

## Current website features

### PDF
- Merge PDF files in the selected order.
- Split a PDF into individual pages.
- Extract selected pages and ranges.
- Rotate selected pages.
- Convert still images into a PDF.
- Render PDF pages as PNG images.

### Images
- Resize images with optional aspect-ratio preservation.
- Convert between PNG, JPG and WEBP.
- Compress JPG and WEBP output with a quality setting.
- Process multiple images in one batch.

### Text and data
- Character, word and line statistics.
- Uppercase, lowercase, title case and sentence case.
- Remove blank lines and duplicate lines.
- Format and validate JSON.
- CSV to JSON and JSON to CSV.
- URL and Base64 encode/decode.
- Percentage calculations.
- Length, weight, time and temperature conversion.

## Run the website locally

Requirements: Node.js 22.12 or newer.

```powershell
cd web
npm install
npm run dev
```

Open the local URL printed by Vite.

## Tests and production build

Run the unit tests:

```powershell
cd web
npm test
```

Run the production build:

```powershell
$env:GITHUB_PAGES = "true"
npm run build
```

Run browser, PDF, mobile-layout and accessibility checks:

```powershell
npm run test:e2e
```

The automated workflows run unit tests, production dependency security audit, a GitHub Pages build, Playwright browser tests and axe accessibility checks.

## Hosting

The website is configured for GitHub Pages on the public repository. The intended address is:

`https://gaurav01mh.github.io/everyday-tools-python/`

To enable publishing, open **Repository Settings → Pages → Build and deployment → Source** and select **GitHub Actions**. After that, the Pages workflow builds and deploys the site when the website branch is updated. The site must pass its workflow before its link should be treated as live.

GitHub Pages is static hosting; there is no paid application server or usage-credit runtime. GitHub's own hosting and Actions terms/limits still apply.

## Privacy and security

- Source documents are read as local browser files; the application does not send them to a server.
- The app code has no analytics, ad network, account, or AI service.
- Dependencies are pinned and bundled with the site; there are no runtime CDNs.
- A restrictive Content Security Policy is included.
- A service worker caches the site files after the first successful visit. It does not cache selected documents.
- Downloads are new files; the app does not edit the originals in place.

GitHub Pages still receives normal website request metadata, such as visitor IP addresses, for hosting and security.

See [web/README.md](web/README.md) and [web/public/THIRD_PARTY_NOTICES.md](web/public/THIRD_PARTY_NOTICES.md) for implementation and license details.

## Browser limits and unsupported work

The browser app deliberately uses conservative limits: 100 MB total selected input, 50 MB per PDF, 20 MB per image, 16 megapixels per image, 20 files per batch, 250 pages per PDF, and 100 MB per generated PDF/ZIP. PDF rendering has additional page and pixel limits. Browser/device memory can still be lower than these ceilings.

Encrypted PDFs, OCR, PDF text editing, signatures and form filling are not supported. PDF page-copy operations may not preserve document-level objects such as bookmarks, attachments, forms and annotations. Saving a modified PDF invalidates existing digital signatures. Animated images are not accepted.

Keep original copies of important documents and verify results before sharing them.

## Project status

Website development is on the separate `app/browser-tools-website` branch. The default `main` branch has not been changed. The website should not be considered released until the CI checks pass and GitHub Pages reports a successful deployment.
