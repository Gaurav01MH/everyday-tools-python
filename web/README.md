# Files Format web application

A browser-based toolkit with 35 PDF, image, text and data utilities.

Live GitHub Pages site: https://gaurav01mh.github.io/everyday-tools-python/

## Requirements

- Node.js 22.12 or newer
- npm

## Development

From this directory:

```sh
npm install
npm run dev
npm test
npm run build
node scripts/check-seo-output.mjs
npm run preview
npm run test:e2e
```

## Routes and SEO

Every tool has a direct route such as /merge-pdf/ or /compress-image/. Each route has its own title, meta description, H1, FAQ, canonical URL, Open Graph title/description and Twitter large-image card. The /tools/<slug>/ detail pages canonicalise to the direct routes.

The build generates robots.txt and sitemap.xml. The site owner must verify the site in Google Search Console and submit /sitemap.xml.

## File processing and privacy

- PDF, image, text and data transformations run locally in the browser.
- Link Tool and QR Tool are designed as upload-based sharing options, but are currently disabled on GitHub Pages. They do not upload files or text on this deployment.
- No third-party analytics or advertising scripts are included.
- Use browser DevTools → Network to verify that a local tool does not send the selected file to a processing server.

The service worker caches static app assets for offline use and bypasses /api/* and /s/* routes. PDF.js, PDF processing, image processing and QR modules are dynamically loaded only when needed. PDF.js page rendering uses its worker; other transformations still run on the browser main thread.

## Current limits

- 100 MB total selected input; 50 MB per PDF; 20 MB and 16 megapixels per image.
- 20 files per batch; 250 pages per PDF; previews and PDF-to-image rendering up to 100 pages.
- 100 MB generated PDF/ZIP output.
- PDF compression optimises structure and metadata but does not recompress embedded images.
- Target-size image compression is best-effort.
- Password-protected PDFs, OCR, PDF text editing, digital signatures, forms, annotations and animated image processing are not supported.

CI checks browser functionality, a mobile viewport and axe accessibility rules. A physical-phone check and measured Lighthouse scores require separate real-device/performance testing.

Third-party analytics has deliberately not been added; preserving a no-third-party-request design is intentional.
