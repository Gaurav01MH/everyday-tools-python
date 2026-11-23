# Files Format website

A browser-based utility site for PDF, image, text and data tasks, with separate Link Tool and QR Tool sharing options. The original simple three-tab interface is preserved.

## Requirements and commands

- Node.js 22.12 or newer
- npm

From this directory, run npm install, npm run dev, npm test, npm run build, node scripts/check-seo-output.mjs, npm run preview and npm run test:e2e as needed.

The production build generates the Vite app, PDF.js support resources, individual tool and category HTML pages, the sitemap, llms.txt and a service worker. The service worker deliberately bypasses /api/* and /s/*, so uploads and downloads are not cached.

## Tools and upload behavior

- PDF and image editing run locally in the browser. These selected source files are not uploaded.
- Ordinary text/data tools run locally in the browser.
- Link Tool accepts one file or pasted text (not both), uploads it to Cloudflare R2 after Turnstile verification, and returns a shareable download URL.
- QR Tool accepts one file or pasted text, creates the same temporary share URL, then generates a downloadable PNG and SVG QR code for that URL.

Share limits: one item per link, 10 MB maximum per upload, 300 active share objects and 3 GB active storage. Links expire after seven days. R2 lifecycle cleanup removes expired objects. Anyone with the share URL can download it, so do not share confidential or personal documents.

## Free GitHub Pages URL

The existing GitHub Pages deployment remains on the free GitHub-hosted address. A branded alias is generated inside the existing project without changing the repository or breaking the original URL:

https://gaurav01mh.github.io/everyday-tools-python/too-broke-for-a-custom-domain/

The application name remains **Files Format**. GitHub Pages does not let a project repository create a new subdomain; this nested path is the available no-cost option while keeping the current deployment. The GitHub Pages workflow publishes this alias automatically on pushes to main.

GitHub Pages is static hosting, so the Link Tool and QR Tool's server-side share upload feature is unavailable at this fallback address. The local PDF, image and text tools remain available.

## Search and AI discovery

- Every tool has an individual static page under /tools/.
- Category and directory pages link to the individual tools.
- robots.txt, sitemap.xml and llms.txt are generated on each production build.
- Pages have unique titles, descriptions, canonical URLs, Open Graph metadata and JSON-LD structured data.
- OAI-SearchBot is allowed and GPTBot is disallowed. These settings improve crawlability but cannot guarantee indexing or recommendations.

After deploying the Pages hostname, verify ownership in Google Search Console and submit /sitemap.xml.

## MCP integration

The optional MCP connector is a separate Cloudflare Worker under ../mcp-server/. It uses the Pages site as its tool-link destination. Its own free workers.dev endpoint uses the same phrase in a separate hostname. See ../mcp-server/README.md.

## Privacy and limits

- No user account, advertising integration or analytics is required.
- Turnstile checks every share upload; its secret is a server-side Pages Function secret, never a Vite build variable.
- Uploaded share content is stored in the R2 bucket files-format-shares, bound as SHARES.
- Files are served as downloads with attachment, no-sniff, no-index and restrictive CSP headers.
- Do not upload content you do not own or have permission to share.
- R2 free quotas are finite; usage above the included monthly allowances may be billed. The active-share cap is conservative but this is not unlimited free hosting.

Local PDF limits remain 100 MB total input, 50 MB per PDF, 20 MB per image, 16 megapixels per image, 20 files per batch, 250 pages per PDF and 100 MB generated PDF/ZIP output.
