# Files Format

Files Format is a free, browser-based collection of PDF, image, text and data utilities.

Selected files are processed locally in the browser. The application does not upload files to a Files Format processing server and does not require an account.

## Tools

### PDF
- Merge PDFs in a chosen order.
- Split PDFs into separate page files.
- Extract selected pages and ranges.
- Rotate all or selected pages.
- Convert still images into a PDF.
- Render PDF pages as PNG images.

### Images
- Resize still images with optional aspect-ratio preservation.
- Convert JPG, PNG, WEBP and BMP input to common output formats.
- Compress JPG and WEBP output.
- Process batches of images.

### Text and data
- Text statistics and case conversion.
- Remove blank and duplicate lines.
- Format and validate JSON.
- Convert CSV to JSON and JSON to CSV.
- URL and Base64 encoding/decoding.
- Percentage calculations.
- Length, weight, time and temperature conversion.

## Search and AI discovery

The production build generates an individual static HTML page for every tool, category pages, a complete directory, robots.txt, an XML sitemap, llms.txt, canonical URLs, Open Graph metadata and JSON-LD structured data. The homepage keeps the original simple three-tab interface; the crawlable directory and tool pages are separate from the app UI.

OAI-SearchBot is allowed in robots.txt. GPTBot is disallowed. These settings and metadata make the pages discoverable but cannot guarantee indexing, ranking or recommendations by a search engine or AI service.

## Run locally

Requirements: Node.js 22.12 or newer.

From the `web` directory:
1. Run `npm install`.
2. Run `npm run dev`.
3. Open the local address printed by Vite.

## Tests and production build

Run `npm test`, `npm run build`, `node scripts/check-seo-output.mjs` and `npm run test:e2e` from `web`.

The automated workflows run unit tests, dependency auditing, production builds, generated SEO checks, browser tests, accessibility checks and mobile-layout checks.

## Hosting

The current deployment still uses the personal GitHub Pages hostname associated with this repository. The Pages build supports repository variables `PUBLIC_SITE_ORIGIN` and `PUBLIC_BASE_PATH`, so the canonical URL, sitemap and tool links can be switched together when a neutral hostname is connected.

A hostname without the repository owner's name requires a custom domain or moving the Pages site to a separate organisation/hosting account. No new hostname has been connected yet.

## MCP integration

A Cloudflare Worker in `mcp-server/` serves both the website and MCP endpoint from one free `workers.dev` hostname. See [MCP setup](mcp-server/README.md). The Cloudflare account owner must authorize the first deployment; GitHub Pages remains a fallback. PDF and image processing remains local in the browser; only text explicitly supplied by an AI client is sent to the Worker.

## Privacy and limits

- No account, ad network, analytics service or AI API is included in the application.
- Selected files are read locally by browser APIs and libraries.
- The service worker caches static site files, not selected documents.
- The website host receives ordinary hosting request metadata.
- Downloads are new files; source files are not overwritten.

Safety limits include 100 MB total selected input, 50 MB per PDF, 20 MB per image, 16 megapixels per image, 20 files per batch, 250 pages per PDF and 100 MB per generated PDF or ZIP. Browser memory may impose lower practical limits.

Encrypted PDFs, OCR, editing existing PDF text, digital signatures, annotations, form filling and animated image processing are not supported. PDF rewriting can lose bookmarks, attachments, forms and annotations, and invalidates existing digital signatures. Keep original copies of important files and verify outputs.

## Policies and licenses

- [About Files Format](web/public/about/index.html)
- [Privacy policy](web/public/policies/privacy/index.html)
- [Terms of use](web/public/policies/terms/index.html)
- [Licensing](web/public/policies/licensing/index.html)
- [Third-party notices](web/public/THIRD_PARTY_NOTICES.md)
- [MIT License](LICENSE.md)

The application source is under the MIT License. Third-party dependencies remain under their respective licenses.
