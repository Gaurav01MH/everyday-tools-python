# Files Format website

A static browser-based utility site for PDF, image, text and data tasks. The main app retains its original simple three-tab interface and task selector.

## Requirements and commands

- Node.js 22.12 or newer
- npm

From this directory run `npm install`, `npm run dev`, `npm test`, `npm run build`, `node scripts/check-seo-output.mjs`, `npm run preview` and `npm run test:e2e` as needed.

The production build creates the Vite app, copies PDF.js support resources, generates static HTML pages for each tool and category, creates the sitemap and llms.txt, and builds an offline service worker that caches static site assets only.

## MCP integration

The public `/connect/` page explains the separate remote MCP Worker. The website remains static and browser-only for file operations; the MCP server source is kept in the repository's `mcp-server/` directory.

## Search engine and AI discovery

- Each tool has an individual static HTML page under `/tools/`.
- Category and directory pages link to the individual tools.
- The root includes `robots.txt`, `sitemap.xml` and `llms.txt`.
- Pages use unique titles, descriptions, canonical URLs, Open Graph metadata and relevant JSON-LD structured data.
- The homepage receives its metadata at build time; the original UI is not replaced with search cards.
- Individual tool-page links open the corresponding operation in the original workspace.

OAI-SearchBot is allowed and GPTBot is disallowed. These settings improve crawlability but cannot guarantee indexing, ranking or recommendations.

After the final public URL is stable, verify ownership in Google Search Console and submit `/sitemap.xml`.

## Browser-only processing

The file-processing functions read browser File objects and use client-side libraries. They do not send selected source files to a Files Format processing server. The service worker caches same-origin static app files only, not selected files or generated downloads.

## UI and accessibility

The original layout remains in place: simple PDF, image and text/data tabs, a task selector, file drop zone, options and result panel. Text & data now includes a Link maker for Markdown/HTML and a browser-local QR generator with PNG and SVG downloads. Individual SEO pages are separate from the app interface. The logo and favicon are code-based SVG assets.

## Limits

- 100 MB total selected input.
- 50 MB per PDF; 20 MB and 16 megapixels per image.
- 20 files per batch; maximum 12 PDFs in a merge.
- Up to 250 pages per PDF; rendering is limited to 100 pages.
- 100 MB per generated PDF/ZIP output.
- 2 million characters per text input.

Actual browser memory may be lower than these safety limits.

## PDF caveats

Password-protected PDFs are rejected. Rewriting PDFs can lose bookmarks, attachments, form fields and annotations, and invalidates existing signatures. OCR, editing text inside a PDF, signing, annotation editing and form filling are not implemented.

## Hosting

The GitHub Pages workflow remains a fallback. The optional combined Cloudflare Worker is configured with the free hostname slug `too-broke-for-a-custom-domain`; Cloudflare appends the account's `workers.dev` subdomain after the Worker is deployed. See `mcp-server/README.md` for the free deployment instructions. The exact public hostname does not exist until it is deployed in the connected Cloudflare account.
