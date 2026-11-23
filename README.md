# Files Format

Files Format is a free collection of PDF, image, text and data tools, plus two optional temporary sharing tools.

The original simple three-tab interface is preserved. PDF and image editing and ordinary text/data utilities process locally in the browser. Link Tool and QR Tool are deliberate exceptions: they upload only the file or text the visitor chooses to share and create a public-by-link download URL.

## Tools

### PDF
- Merge PDFs in a chosen order.
- Split PDFs into separate page files.
- Extract selected pages and ranges.
- Rotate all or selected pages.
- Convert still images into a PDF.
- Render PDF pages as PNG images.

### Images
- Resize still images.
- Convert JPG, PNG, WEBP and BMP formats.
- Compress JPG and WEBP images.
- Process image batches.

### Text and data
- Text statistics, case conversion, blank-line cleanup and duplicate-line removal.
- JSON formatting and validation.
- CSV/JSON conversion.
- URL and Base64 encoding/decoding.
- Percentage and unit calculations.
- Link Tool: paste text or upload one file (maximum 10 MB) to create a shareable download URL.
- QR Tool: paste text or upload one file to create the same kind of share URL, then download a QR code for that URL as PNG or SVG.

Share links expire after seven days. Anyone with the URL can download the contents. Uploads require a Cloudflare Turnstile check. Do not use the share tools for confidential or personal files or content you lack permission to share.

## Free website hostname

The requested Cloudflare Pages project name is exactly: too-broke-for-a-custom-domain

Intended public URL, available only after the project name is claimed and deployed:

https://too-broke-for-a-custom-domain.pages.dev/

No paid custom domain is required. Cloudflare must confirm the project name is available during account setup. The previous GitHub Pages hostname remains a fallback with share uploads disabled.

## Hosting and storage setup

See web/DEPLOY-CLOUDFLARE.md. The setup uses Pages Functions under web/functions/, an R2 bucket named files-format-shares, the SHARES binding, Turnstile and an R2 lifecycle rule for the shared/ prefix. Application caps: one file or text per share, 10 MB per upload, 300 active objects, 3 GB active content and a seven-day link lifetime.

R2 free usage is limited, not unlimited; usage above free allowances may be billed. Anyone with a share URL can download it.

## MCP integration

The optional MCP server is a separate Cloudflare Worker in mcp-server/. It discovers the 29 website tools and can prepare a QR Tool link with text prefilled. It does not accept file uploads or bypass Turnstile. The Worker has its own phrase-branded free workers.dev hostname, separate from the Pages hostname. See mcp-server/README.md.

## Search and AI discovery

The production build generates static HTML pages for every tool, category pages, a complete directory, robots.txt, sitemap.xml, llms.txt, canonical URLs, Open Graph metadata and JSON-LD structured data. OAI-SearchBot is allowed and GPTBot is disallowed. Crawlability does not guarantee indexing or recommendations.

After deploying the final Pages URL, verify ownership in Google Search Console and submit /sitemap.xml.

## Tests and local development

From web/ run npm install, npm run dev, npm test, npm run build, node scripts/check-seo-output.mjs and npm run test:e2e.

## Privacy and limitations

- The application does not require a user account and contains no advertising integration or analytics.
- PDF/image editing uses browser APIs and local libraries.
- Share content is sent to Cloudflare R2 only when the user selects Link Tool or QR Tool and completes Turnstile.
- Shared content is downloadable by anyone with its URL; avoid confidential and personal data.
- R2 quotas are finite and overages may be billed.
- Encrypted PDFs, OCR, editing existing PDF text, signatures, form filling, annotations and animated image processing are not supported.
- Keep originals and verify output before relying on it.

The application source is under the MIT License. Third-party notices and licences remain applicable.
