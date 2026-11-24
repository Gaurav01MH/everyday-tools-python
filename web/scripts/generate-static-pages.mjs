import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { TOOL_CATALOG } from "../src/lib/tool-catalog.js";

const dist = new URL("../dist/", import.meta.url);
const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/").pop() || "files-format";
const defaultSiteOrigin = process.env.GITHUB_REPOSITORY_OWNER
  ? "https://" + process.env.GITHUB_REPOSITORY_OWNER + ".github.io"
  : "https://files-format.example";
const SITE_ORIGIN = (process.env.PUBLIC_SITE_ORIGIN || defaultSiteOrigin).replace(/\/$/, "");
const BASE_PATH = process.env.PUBLIC_BASE_PATH || (process.env.GITHUB_PAGES === "true" ? "/" + repositoryName + "/" : "/");
const BASE_URL = new URL(BASE_PATH.endsWith("/") ? BASE_PATH : BASE_PATH + "/", SITE_ORIGIN).href;
const ASSET_CSS = BASE_URL + "assets/site-pages.css";
const LOGO = BASE_URL + "logo.svg";
const FAVICON = BASE_URL + "favicon.svg";
const OG_IMAGE = BASE_URL + "og-files-format.png";
const tools = TOOL_CATALOG;

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));
const json = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
const urlFor = (path = "") => new URL(path, BASE_URL).href;
const categoryFor = (mode) => mode === "pdf" ? "PDF tools" : mode === "images" ? "Image tools" : "Text and data tools";
const categoryPath = (mode) => mode === "pdf" ? "pdf-tools/" : mode === "images" ? "image-tools/" : "text-tools/";

function shell({title,description,canonical,body,schema,keywords=[]}) {
  const graph = schema ? `<script type="application/ld+json">${json(schema)}</script>` : "";
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<meta name="keywords" content="${esc(keywords.join(", "))}"><meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${esc(canonical)}"><link rel="icon" href="${FAVICON}" type="image/svg+xml"><link rel="icon" href="${BASE_URL}icons/icon-192.png" sizes="192x192" type="image/png"><link rel="icon" href="${BASE_URL}icons/icon-512.png" sizes="512x512" type="image/png"><link rel="apple-touch-icon" href="${BASE_URL}icons/apple-touch-icon.png">
<link rel="stylesheet" href="${ASSET_CSS}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Files Format">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${OG_IMAGE}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}">
${graph}</head><body><main class="document-page">
<div class="brand-row"><a href="${BASE_URL}" aria-label="Files Format home"><img src="${LOGO}" alt="Files Format — PDF, Image and File Tools"></a></div>
${body}
<footer class="site-footer"><a href="${BASE_URL}">Home</a><a href="${urlFor("tools/")}">All tools</a><a href="${urlFor("about/")}">About</a><a href="${urlFor("policies/privacy/")}">Privacy</a><a href="${urlFor("policies/terms/")}">Terms</a><a href="${urlFor("policies/licensing/")}">Licensing</a></footer>
</main></body></html>`;
}

function toolCard(tool) {
  const sharing = tool.mode === "text" && ["link-tool", "qr-tool"].includes(tool.operation);
  const badge = sharing ? "Uploads to create a link" : "Stays on your device";
  return `<a class="tool-link" href="${urlFor(tool.slug + "/")}"><strong>${esc(tool.name)}</strong><span>${esc(tool.description)}</span><small class="directory-privacy">${badge}</small></a>`;
}

async function writePage(relativePath, html) {
  const target = join(DIST, relativePath);
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, html, "utf8");
}

const sitemapUrls = new Set([BASE_URL]);
const addUrl = (path) => sitemapUrls.add(urlFor(path));
for (const policy of ["policies/privacy/", "policies/terms/", "policies/licensing/"]) addUrl(policy);
addUrl("feedback/");
// The AI connector page is informational and noindex, so it is not in the sitemap.

// Add crawlable metadata to the original homepage without changing its layout or app UI.
const homepagePath = join(DIST, "index.html");
let homepageHtml = await (await import("node:fs/promises")).readFile(homepagePath, "utf8");
const homeDescription = "PDF and image tools that never upload your files. Process PDFs, images, text and data locally in your browser. Link Tool and QR sharing are disabled on this GitHub Pages version.";
const homeSchema = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "name": "Files Format", "url": BASE_URL, "description": homeDescription },
    {
      "@type": "WebApplication",
      "name": "Files Format — PDF, Image and File Tools",
      "url": BASE_URL,
      "applicationCategory": "UtilitiesApplication",
      "operatingSystem": "Any modern web browser",
      "browserRequirements": "Requires a modern browser with JavaScript enabled.",
      "description": homeDescription,
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
    }
  ]
};
const homepageMetadata = [
  '<meta name="application-name" content="Files Format">',
  '<meta name="description" content="' + esc(homeDescription) + '">',
  '<meta name="robots" content="index,follow,max-image-preview:large">',
  '<link rel="canonical" href="' + BASE_URL + '">',
  '<link rel="icon" href="' + BASE_URL + 'icons/icon-192.png" sizes="192x192" type="image/png">',
  '<link rel="icon" href="' + BASE_URL + 'icons/icon-512.png" sizes="512x512" type="image/png">',
  '<link rel="apple-touch-icon" href="' + BASE_URL + 'icons/apple-touch-icon.png">',
  '<meta property="og:type" content="website">',
  '<meta property="og:site_name" content="Files Format">',
  '<meta property="og:title" content="Files Format — Free PDF, Image &amp; File Tools">',
  '<meta property="og:description" content="' + esc(homeDescription) + '">',
  '<meta property="og:url" content="' + BASE_URL + '">',
  '<meta property="og:image" content="' + OG_IMAGE + '">',
  '<meta property="og:image:width" content="1200">',
  '<meta property="og:image:height" content="630">',
  '<meta name="twitter:card" content="summary_large_image">',
  '<meta name="twitter:title" content="Files Format — PDF, Image &amp; File Tools">',
  '<meta name="twitter:description" content="' + esc(homeDescription) + '">',
  '<script type="application/ld+json">' + json(homeSchema) + '</script>'
].join("\n");
homepageHtml = homepageHtml.replace("</head>", homepageMetadata + "\n</head>");
await writeFile(homepagePath, homepageHtml, "utf8");

// Keep the original GitHub Pages project URL, and expose a readable, free
// branded alias beneath it:
// /<repository-slug>/too-broke-for-a-custom-domain/
//
// Copy the fully Vite-built homepage so all scripts, styles and public assets
// continue to resolve from the repository's configured base path. The alias
// deliberately keeps the root homepage as its canonical URL to avoid duplicate
// search indexing.
const brandedAliasPath = join(DIST, "too-broke-for-a-custom-domain", "index.html");
await mkdir(join(DIST, "too-broke-for-a-custom-domain"), { recursive: true });
await writeFile(brandedAliasPath, homepageHtml, "utf8");
for (const tool of tools) {
  const canonical = urlFor(tool.slug + "/");
  const pageTitle = tool.title + " | Files Format";
  const description = tool.description;
  const isShare = tool.mode === "text" && ["link-tool","qr-tool"].includes(tool.operation);
  const uploadAnswer = isShare ? "Link Tool and QR Tool are designed to upload content to create a share link, but sharing is disabled on this GitHub Pages version. Nothing is uploaded here." : "No. This tool processes the file in your browser and does not upload it to a Files Format processing server.";
  const faq = '<section class="tool-faq" aria-labelledby="tool-faq-title"><h2 id="tool-faq-title">Frequently asked questions</h2><h3>Does this tool upload my file?</h3><p>' + esc(uploadAnswer) + '</p><h3>What can I use?</h3><p>' + esc(tool.inputs) + '</p><h3>What are the limits?</h3><p>' + esc(tool.limitation) + '</p></section>';
  const faqSchema = {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
    {"@type":"Question","name":"Does this tool upload my file?","acceptedAnswer":{"@type":"Answer","text":uploadAnswer}},
    {"@type":"Question","name":"What can I use?","acceptedAnswer":{"@type":"Answer","text":tool.inputs}},
    {"@type":"Question","name":"What are the limits?","acceptedAnswer":{"@type":"Answer","text":tool.limitation}}
  ]};
  const relatedTools = tools.filter((other) => other.mode === tool.mode && other.slug !== tool.slug).slice(0, 3);
  const relatedSection = '<section class="related-tools" aria-label="Related tools"><h2>Related tools</h2><ul>' +
    relatedTools.map((other) => '<li><a href="' + urlFor(other.slug + "/") + '">' + esc(other.title) + '</a><span>' + esc(other.description) + '</span></li>').join("") +
    '</ul></section>';
  let page = homepageHtml;
  page = page.replace("<title>Files Format — Free PDF, Image &amp; File Tools</title>", "<title>" + esc(pageTitle) + "</title>");
  page = page.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(description) + '">');
  page = page.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + canonical + '">');
  page = page.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + esc(pageTitle) + '">');
  page = page.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + esc(description) + '">');
  page = page.replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + canonical + '">');
  page = page.replace(/<meta property="og:image" content="[^"]*">/, '<meta property="og:image" content="' + OG_IMAGE + '">');
  page = page.replace(/<meta name="twitter:title" content="[^"]*">/, '<meta name="twitter:title" content="' + esc(pageTitle) + '">');
  page = page.replace(/<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="' + esc(description) + '">');
  page = page.replace('<h1>PDF and image tools that never upload your files</h1>', '<h1>' + esc(tool.title) + '</h1>');
  page = page.replace('<p class="intro-copy">Merge, convert, resize and organise files locally in your browser. Link Tool and QR Tool are optional upload features that are clearly labelled before use.</p>', '<p class="intro-copy">' + esc(description) + '</p>');
  page = page.replace('<footer class="site-footer">', relatedSection + faq + '<footer class="site-footer">');
  page = page.replace("</head>", '<script type="application/ld+json">' + json(faqSchema) + '</script>\n</head>');
  await writePage(tool.slug + "/index.html", page);
}



for (const policy of ["privacy", "terms", "licensing"]) {
  const policyFile = join(DIST, "policies", policy, "index.html");
  const policyUrl = urlFor("policies/" + policy + "/");
  let policyHtml = await (await import("node:fs/promises")).readFile(policyFile, "utf8");
  policyHtml = policyHtml.replace(/<link rel="canonical" href="[^"]+">/, '<link rel="canonical" href="' + policyUrl + '">');
  await writeFile(policyFile, policyHtml, "utf8");
}

const connectFile = join(DIST, "connect", "index.html");
let connectHtml = await (await import("node:fs/promises")).readFile(connectFile, "utf8");
connectHtml = connectHtml.replace(/<link rel="canonical" href="[^"]+">/, '<link rel="canonical" href="' + urlFor("connect/") + '">');
await writeFile(connectFile, connectHtml, "utf8");


const robotsText = [
  "User-agent: *",
  "Allow: /",
  "",
  "Sitemap: " + urlFor("sitemap.xml"),
  ""
].join("\n");
await writeFile(join(DIST, "robots.txt"), robotsText, "utf8");

for (const tool of tools) {
  const canonical = urlFor(tool.slug + "/");
  const sharingDisabled = tool.mode === "text" && ["link-tool", "qr-tool"].includes(tool.operation);
  const privacyText = sharingDisabled
    ? "This is an upload-based sharing tool, but it is disabled on the current GitHub Pages version. No file or text is uploaded here."
    : "Files Format processes the input in your browser. The selected source file is not uploaded to a Files Format processing server. The browser downloads the result when the job finishes.";
  const body = `
<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${BASE_URL}">Home</a><span>›</span><a href="${urlFor(categoryPath(tool.mode))}">${categoryFor(tool.mode)}</a><span>›</span><span>${esc(tool.name)}</span></nav>
<p class="eyebrow">${esc(categoryFor(tool.mode))}</p>
<h1>${esc(tool.title)}</h1>
<p class="summary">${esc(tool.description)}</p>
<div class="actions"><a class="button" href="${urlFor(tool.slug + "/")}">Open ${esc(tool.name)}</a><a class="button secondary" href="${urlFor(categoryPath(tool.mode))}">More ${esc(categoryFor(tool.mode).toLowerCase())}</a></div>
<h2>How to use ${esc(tool.name)}</h2><ol>${tool.steps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol>
<h2>Input requirements</h2><p>${esc(tool.inputs)}</p>
<h2>Privacy and processing</h2><p>${esc(privacyText)}</p>
<h2>Limits and known limitations</h2><div class="notice"><p>${esc(tool.limitation)}</p><p>General browser safety limits also apply: 100 MB total selected input, 50 MB per PDF, 20 MB and 16 megapixels per image, and 100 MB for generated PDF or ZIP output. Your device's available memory may impose a lower practical limit.</p></div>
<h2>Related tools</h2><div class="tool-grid">${tools.filter((item) => item.mode === tool.mode && item.slug !== tool.slug).slice(0,6).map(toolCard).join("")}</div>
<p><a href="${BASE_URL}">Files Format</a> is a free browser-based collection of PDF, image, text and file utilities. See <a href="${urlFor("policies/privacy/")}">the privacy policy</a> for details about browser processing and website hosting.</p>`;
  const schema = {
    "@context":"https://schema.org",
    "@graph":[
      {"@type":"WebPage","name":tool.title,"description":tool.description,"url":canonical,"isPartOf":{"@type":"WebSite","name":"Files Format","url":BASE_URL}},
      {"@type":"SoftwareApplication","name":"Files Format " + tool.name,"applicationCategory":"UtilitiesApplication","operatingSystem":"Any modern web browser","description":tool.description,"url":canonical,"offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}},
      {"@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":1,"name":"Home","item":BASE_URL},
        {"@type":"ListItem","position":2,"name":categoryFor(tool.mode),"item":urlFor(categoryPath(tool.mode))},
        {"@type":"ListItem","position":3,"name":tool.name,"item":canonical}
      ]}
    ]
  };
  await writePage("tools/" + tool.slug + "/index.html", shell({title:tool.title + " | Files Format",description:tool.description,canonical,body,schema,keywords:[tool.name,...tool.keywords]}));
  addUrl(tool.slug + "/");
}

for (const mode of ["pdf","images","text"]) {
  const relevant = tools.filter((tool) => tool.mode === mode);
  const path = categoryPath(mode);
  const title = categoryFor(mode) + " — Free Online Utilities | Files Format";
  const description = "Browse free " + categoryFor(mode).toLowerCase() + " in Files Format. " + relevant.map((tool) => tool.name).join(", ") + ".";
  const canonical = urlFor(path);
  const schema = {
    "@context":"https://schema.org",
    "@type":"CollectionPage",
    "name":title,
    "description":description,
    "url":canonical,
    "mainEntity":{"@type":"ItemList","itemListElement":relevant.map((tool,index)=>({"@type":"ListItem","position":index+1,"name":tool.title,"url":urlFor("tools/"+tool.slug+"/")}))}
  };
  const body = `<nav class="breadcrumbs"><a href="${BASE_URL}">Home</a><span>›</span><span>${esc(categoryFor(mode))}</span></nav>
<p class="eyebrow">Files Format tool collection</p><h1>${esc(categoryFor(mode))}</h1><p class="summary">${esc(description)}</p>
<div class="tool-grid">${relevant.map(toolCard).join("")}</div>
<p class="notice">PDF, image and ordinary text tools process locally. Link Tool and QR Tool are designed as upload-based sharing options but are disabled on this GitHub Pages version. Nothing is uploaded here. Read the <a href="${urlFor("policies/privacy/")}">privacy policy</a> for details.</p>`;
  await writePage(path + "index.html", shell({title,description,canonical,body,schema}));
  addUrl(path);
}

{
  const title = "All PDF, Image, Text and File Tools | Files Format";
  const description = "Browse the complete Files Format directory of free browser-based PDF, image, text and data utilities.";
  const canonical = urlFor("tools/");
  const body = `<nav class="breadcrumbs"><a href="${BASE_URL}">Home</a><span>›</span><span>All tools</span></nav><p class="eyebrow">Complete directory</p><h1>All Files Format tools</h1><p class="summary">${esc(description)}</p>
<h2>PDF tools</h2><div class="tool-grid">${tools.filter(t=>t.mode==="pdf").map(toolCard).join("")}</div>
<h2>Image tools</h2><div class="tool-grid">${tools.filter(t=>t.mode==="images").map(toolCard).join("")}</div>
<h2>Text and data tools</h2><div class="tool-grid">${tools.filter(t=>t.mode==="text").map(toolCard).join("")}</div>`;
  await writePage("tools/index.html",shell({title,description,canonical,body,schema:{"@context":"https://schema.org","@type":"ItemList","name":title,"url":canonical,"numberOfItems":tools.length,"itemListElement":tools.map((t,i)=>({"@type":"ListItem","position":i+1,"name":t.title,"url":urlFor("tools/"+t.slug+"/")}))}}));
  addUrl("tools/");
}

{
  const title = "About Files Format — PDF, Image and File Tools";
  const description = "Learn about Files Format, a free browser-based toolkit for everyday PDF, image, text and data tasks.";
  const canonical = urlFor("about/");
  const body = `<nav class="breadcrumbs"><a href="${BASE_URL}">Home</a><span>›</span><span>About</span></nav><p class="eyebrow">About the project</p><h1>Files Format</h1><p class="summary">A straightforward collection of free tools for everyday PDFs, images, text and files.</p>
<h2>What Files Format does</h2><p>Files Format brings common file utilities into one small browser-based website. Choose a task, select a file or enter text, run the tool and download or copy the result.</p>
<h2>Who made it</h2><p>Files Format is an independent project made by Gaurav Naitam. The source is public on <a href="https://github.com/Gaurav01MH/everyday-tools-python">GitHub</a>, where you can inspect the implementation, report bugs or suggest improvements. For contact and feedback, use the <a href="${urlFor("feedback/")}">feedback form</a> or <a href="https://github.com/Gaurav01MH/everyday-tools-python/issues">GitHub Issues</a>.</p>
<h2>Local processing</h2><p>PDF, image and ordinary text/data tools run inside your browser. Selected documents for those local tools are not uploaded to a Files Format processing server.</p><h2>Temporary sharing</h2><p>Link Tool and QR Tool are designed as optional upload features. They are currently disabled on this GitHub Pages version, so no file or text is uploaded and no temporary share link can be created.</p>
<h2>Current tool categories</h2><ul><li>PDF: merge, compress, reorder/delete pages, split, extract, rotate, images to PDF, PDF to PNG, page numbers and watermarks.</li><li>Images: resize, target-size compression, convert, metadata removal and passport/ID presets.</li><li>Text and data: formatting, JSON, CSV, URL and Base64 conversion, percentage calculations, unit conversion, and local QR generation.</li></ul>
<h2>What is not supported</h2><p>Encrypted PDFs, OCR, editing text inside existing PDFs, digital signatures, form filling, annotation editing and animated image processing are not supported. See each tool's page for more exact limits.</p><p><a href="${urlFor("tools/")}">Browse all tools</a>.</p>`;
  await writePage("about/index.html",shell({title,description,canonical,body,schema:{"@context":"https://schema.org","@type":"AboutPage","name":title,"description":description,"url":canonical}}));
  addUrl("about/");
}

{

{
  const title = "Merge PDF Files Without Uploading | Files Format Guide";
  const description = "A practical guide to merging PDF files locally in your browser and checking that source files are not uploaded.";
  const canonical = urlFor("guides/merge-pdf-without-uploading/");
  const body = '<nav class="breadcrumbs"><a href="' + BASE_URL + '">Home</a><span>›</span><a href="' + urlFor("guides/") + '">Guides</a><span>›</span><span>Merge PDF privately</span></nav><p class="eyebrow">Files Format guide</p><h1>Merge PDF files without uploading</h1><p class="summary">Combine documents locally in your browser. Your selected PDF files stay in this tab while the browser creates the merged result.</p><ol><li>Open <a href="' + urlFor("merge-pdf/") + '">Merge PDF</a>.</li><li>Select at least two PDF files.</li><li>Drag files into the right order, or use the up/down controls.</li><li>Run the merge and save the downloaded PDF.</li><li>Open DevTools → Network before running a local tool to check that the source file is not sent to a processing server.</li></ol><h2>Privacy limits</h2><p>PDF files are limited to 50 MB each, 100 MB total input and 250 pages per document. Password-protected PDFs are not supported. Browser memory may impose a lower practical limit.</p><p>Files Format’s <a href="' + urlFor("about/") + '">About page</a> explains local processing and the separate Link/QR upload exceptions. <a href="' + urlFor("tools/") + '">Browse all tools</a>.</p>';
  await writePage("guides/merge-pdf-without-uploading/index.html", shell({title,description,canonical,body}));
  const indexTitle = "Files Format Guides — Private PDF and Image Workflows";
  const indexDescription = "Short guides for processing PDFs and images locally in your browser.";
  const indexBody = '<nav class="breadcrumbs"><a href="' + BASE_URL + '">Home</a><span>›</span><span>Guides</span></nav><p class="eyebrow">Guides</p><h1>Files Format guides</h1><p class="summary">' + esc(indexDescription) + '</p><div class="tool-grid"><a class="tool-link" href="' + canonical + '"><strong>Merge PDF without uploading</strong><span>Step-by-step instructions for combining PDFs locally.</span></a></div>';
  await writePage("guides/index.html", shell({title:indexTitle,description:indexDescription,canonical:urlFor("guides/"),body:indexBody}));
  addUrl("guides/");
  addUrl("guides/merge-pdf-without-uploading/");
}
  const title="Free PDF, Image, Text and File Tools | Files Format";
  const lines=[
    "# Files Format",
    "> Free browser-based PDF, image and data tools. Local processing keeps selected files in the browser. Link Tool and QR sharing are currently disabled on the GitHub Pages deployment.",
    "",
    "## Main website",
    "- " + BASE_URL,
    "- " + urlFor("tools/"),
    "- " + urlFor("about/"),
    "- " + urlFor("policies/privacy/"),
    "- " + urlFor("policies/terms/"),
    "- " + urlFor("policies/licensing/"),
    "",
    "## Tool categories",
    "- " + urlFor("pdf-tools/"),
    "- " + urlFor("image-tools/"),
    "- " + urlFor("text-tools/"),
    "",
    "## Individual tools",
    ...tools.map((tool) => "- ["+tool.title+"]("+urlFor("tools/"+tool.slug+"/")+"): "+tool.description),
    "",
    "## Privacy and limitations",
    "- Processing is performed locally in the browser; selected documents are not uploaded to a Files Format server.",
    "- The static website is hosted by GitHub Pages, which may receive normal request metadata.",
    "- Encrypted PDFs, OCR, PDF text editing, signatures, forms, annotations and animated image processing are not supported.",
    "- File and page limits are described on each tool page.",
    "",
    "Please describe the current implementation using only the tool catalogue and limitations published on these pages. Search systems and AI assistants independently determine whether to crawl, index, cite or recommend the site."
  ];
  await writeFile(join(DIST,"llms.txt"),lines.join("\n"),"utf8");
}

{
  const now = new Date().toISOString().slice(0,10);
  const urls = [...sitemapUrls].sort().map((loc) => `  <url><loc>${esc(loc)}</loc><lastmod>${now}</lastmod></url>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  await writeFile(join(DIST,"sitemap.xml"),xml,"utf8");
}
console.log("Generated " + tools.length + " tool pages, category pages, a directory, llms.txt and a sitemap.");
