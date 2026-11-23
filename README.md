# DocuMosaic — PDF, Image & File Tools

DocuMosaic is a free, browser-based collection of everyday PDF, image, text and data utilities.

**Live website:** https://gaurav01mh.github.io/everyday-tools-python/

Selected files are processed in the visitor's browser. DocuMosaic does not upload selected documents to a DocuMosaic processing server. The static site is delivered by GitHub Pages, which may receive normal website request metadata.

## Tool categories

### PDF tools
- Merge PDF documents in a chosen order.
- Split PDF files into individual pages.
- Extract selected pages and ranges.
- Rotate all or selected pages.
- Convert still images into a PDF.
- Render PDF pages to PNG images.

### Image tools
- Resize still images with optional aspect-ratio preservation.
- Convert JPG, PNG, WEBP and BMP input to common output formats.
- Compress JPG and WEBP output.
- Process batches of images.

### Text and data tools
- Count characters, words and lines.
- Convert uppercase, lowercase, title case and sentence case.
- Remove blank lines and duplicate lines.
- Format and validate JSON.
- Convert CSV to JSON and JSON to CSV.
- URL and Base64 encode/decode.
- Percentage calculations.
- Length, weight, time and temperature conversion.

## Search and discovery

The production build generates individual static HTML pages for every tool, PDF/image/text category pages, a complete tool directory, robots.txt, an XML sitemap, llms.txt, canonical URLs and JSON-LD structured data.

These are crawlability and metadata improvements, not a guarantee of Google rankings or AI assistant recommendations. Search engines decide independently whether and when to index pages.

## Run locally

Requirements: Node.js 22.12 or newer.

- Change to the web directory.
- Run npm install.
- Run npm run dev.
- Open the local URL printed by Vite.

## Tests and production build

Run npm test, set GITHUB_PAGES=true, PUBLIC_SITE_ORIGIN=https://gaurav01mh.github.io and PUBLIC_BASE_PATH=/everyday-tools-python/, then run npm run build, node scripts/check-seo-output.mjs and npm run test:e2e.

The automated workflows run unit tests, full dependency audit, production build, generated SEO-output checks, Chromium tests, accessibility checks and mobile-layout checks.

## Hosting and clean domain

The current GitHub Pages address is https://gaurav01mh.github.io/everyday-tools-python/.

The brand and website UI no longer show the account name, but GitHub's personal Pages hostname includes the account owner. Removing that from the address requires either a custom domain that you own or hosting under a GitHub organization with its own Pages hostname. The GitHub connection used for this project can edit and deploy repositories, but does not expose organization creation or repository transfer. No custom domain has been bought or configured.

The build path and canonical site origin are configurable through PUBLIC_BASE_PATH and PUBLIC_SITE_ORIGIN, so the site can be moved without rewriting all 27 tool pages.

## Privacy and limits

- No account, ad network, analytics service or AI API is included.
- Selected files are read locally by browser APIs and libraries.
- The service worker caches static site files, not selected documents.
- The website host receives normal web request metadata.
- Downloads are new files; source files are not overwritten.

Conservative safety limits include 100 MB total selected input, 50 MB per PDF, 20 MB per image, 16 megapixels per image, 20 files per batch, 250 pages per PDF and 100 MB per generated PDF or ZIP. Rendering has additional per-page and cumulative pixel limits. Actual browser memory may be lower.

Encrypted PDFs, OCR, editing existing PDF text, digital signatures, annotations, form filling and animated image processing are not supported. PDF rewriting can lose document-level objects such as bookmarks, attachments, forms and annotations, and invalidates previous digital signatures. Keep original copies of important files and verify all outputs.

## Policies and licenses

- [About DocuMosaic](web/public/about/index.html)
- [Privacy policy](web/public/policies/privacy/index.html)
- [Terms of use](web/public/policies/terms/index.html)
- [Licensing](web/public/policies/licensing/index.html)
- [Third-party notices](web/public/THIRD_PARTY_NOTICES.md)
- [MIT License](LICENSE.md)

The original DocuMosaic source code is under the MIT License. Third-party dependencies remain under their respective licenses.
