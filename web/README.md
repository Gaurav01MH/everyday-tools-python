# FileDesk website

A static, browser-based utility site for PDF, image, text and data tasks.

## Requirements

- Node.js 22.12 or newer
- npm

## Commands

From this directory run npm install, npm run dev, npm test, npm run build, node scripts/check-seo-output.mjs, npm run preview and npm run test:e2e as needed.

The predev step copies PDF.js support resources into the ignored public/pdfjs folder. The production build creates the Vite application, copies PDF.js support resources, generates static HTML pages for each tool and category, creates the sitemap and llms.txt, and finally builds a versioned offline service worker that precaches the complete site.

## GitHub Pages build

On Windows PowerShell, set GITHUB_PAGES=true, PUBLIC_SITE_ORIGIN=https://gaurav01mh.github.io and PUBLIC_BASE_PATH=/everyday-tools-python/, then run npm run build and node scripts/check-seo-output.mjs.

The origin and base path are configurable for a future organization Pages site or a custom domain.

## Search engine and AI discovery

- Each tool has its own static HTML page under /tools/.
- Category and directory pages link to the individual tools.
- The root includes robots.txt, sitemap.xml and llms.txt.
- Pages use unique titles, descriptions, canonical URLs, Open Graph metadata and relevant JSON-LD structured data.
- Generated pages contain actual tool steps, requirements and limitations, not placeholder keyword pages.

These settings make the pages crawlable and easier to understand. They cannot guarantee indexing, a search ranking or a recommendation by a specific AI system.

After the final public URL is stable, verify ownership in Google Search Console and submit /sitemap.xml. Google requires site ownership verification before Search Console can manage a website property.

## Browser-only processing

The file-processing functions read browser File objects and use client-side libraries. They do not send selected source files to a FileDesk server. The service worker caches same-origin static app files only, not selected files or generated downloads.

## UI and accessibility

- SVG-based FileDesk logo and favicon.
- Clear PDF, image and text/data categories.
- Searchable tool cards connected to actual operations.
- Direct tool links using the tool query parameter.
- Responsive cards and forms, visible focus states and reduced-motion support.
- Native dialog and progress elements.
- Playwright browser checks, axe accessibility tests and mobile layout tests.

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

The current site is deployed through GitHub Pages at https://gaurav01mh.github.io/everyday-tools-python/.

A clean hostname without the personal GitHub username requires a custom domain or transfer to a GitHub organization that owns the Pages site. No domain has been purchased.
