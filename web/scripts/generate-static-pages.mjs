import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { TOOL_CATALOG } from "../src/lib/tool-catalog.js";

const dist = new URL("../dist/", import.meta.url);
const DIST = decodeURIComponent(dist.pathname);
const SITE_ORIGIN = (process.env.PUBLIC_SITE_ORIGIN || "https://gaurav01mh.github.io").replace(/\/$/, "");
const BASE_PATH = process.env.PUBLIC_BASE_PATH || (process.env.GITHUB_PAGES === "true" ? "/everyday-tools-python/" : "/");
const BASE_URL = new URL(BASE_PATH.endsWith("/") ? BASE_PATH : BASE_PATH + "/", SITE_ORIGIN).href;
const ASSET_CSS = BASE_URL + "assets/site-pages.css";
const LOGO = BASE_URL + "logo.svg";
const FAVICON = BASE_URL + "favicon.svg";
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
<link rel="canonical" href="${esc(canonical)}"><link rel="icon" href="${FAVICON}" type="image/svg+xml">
<link rel="stylesheet" href="${ASSET_CSS}">
<meta property="og:type" content="website"><meta property="og:site_name" content="FileDesk">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${LOGO}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}">
${graph}</head><body><main class="document-page">
<div class="brand-row"><a href="${BASE_URL}" aria-label="FileDesk home"><img src="${LOGO}" alt="FileDesk — PDF, Image and File Tools"></a></div>
${body}
<footer class="site-footer"><a href="${BASE_URL}">Home</a><a href="${urlFor("tools/")}">All tools</a><a href="${urlFor("about/")}">About</a><a href="${urlFor("policies/privacy/")}">Privacy</a><a href="${urlFor("policies/terms/")}">Terms</a><a href="${urlFor("policies/licensing/")}">Licensing</a></footer>
</main></body></html>`;
}

function toolCard(tool) {
  return `<a class="tool-link" href="${urlFor("tools/" + tool.slug + "/")}"><strong>${esc(tool.name)}</strong><span>${esc(tool.description)}</span></a>`;
}

async function writePage(relativePath, html) {
  const target = join(DIST, relativePath);
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, html, "utf8");
}

const sitemapUrls = new Set([BASE_URL]);
const addUrl = (path) => sitemapUrls.add(urlFor(path));

for (const tool of tools) {
  const canonical = urlFor("tools/" + tool.slug + "/");
  const body = `
<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${BASE_URL}">Home</a><span>›</span><a href="${urlFor(categoryPath(tool.mode))}">${categoryFor(tool.mode)}</a><span>›</span><span>${esc(tool.name)}</span></nav>
<p class="eyebrow">${esc(categoryFor(tool.mode))}</p>
<h1>${esc(tool.title)}</h1>
<p class="summary">${esc(tool.description)}</p>
<div class="actions"><a class="button" href="${urlFor("?tool=" + tool.slug + "#workspace")}">Open ${esc(tool.name)}</a><a class="button secondary" href="${urlFor(categoryPath(tool.mode))}">More ${esc(categoryFor(tool.mode).toLowerCase())}</a></div>
<h2>How to use ${esc(tool.name)}</h2><ol>${tool.steps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol>
<h2>Input requirements</h2><p>${esc(tool.inputs)}</p>
<h2>Privacy and processing</h2><p>FileDesk processes the input in your browser. The selected source file is not uploaded to a FileDesk processing server. The browser downloads the result when the job finishes.</p>
<h2>Limits and known limitations</h2><div class="notice"><p>${esc(tool.limitation)}</p><p>General browser safety limits also apply: 100 MB total selected input, 50 MB per PDF, 20 MB and 16 megapixels per image, and 100 MB for generated PDF or ZIP output. Your device's available memory may impose a lower practical limit.</p></div>
<h2>Related tools</h2><div class="tool-grid">${tools.filter((item) => item.mode === tool.mode && item.slug !== tool.slug).slice(0,6).map(toolCard).join("")}</div>
<p><a href="${BASE_URL}">FileDesk</a> is a free browser-based collection of PDF, image, text and file utilities. See <a href="${urlFor("policies/privacy/")}">the privacy policy</a> for details about browser processing and website hosting.</p>`;
  const schema = {
    "@context":"https://schema.org",
    "@graph":[
      {"@type":"WebPage","name":tool.title,"description":tool.description,"url":canonical,"isPartOf":{"@type":"WebSite","name":"FileDesk","url":BASE_URL}},
      {"@type":"SoftwareApplication","name":"FileDesk " + tool.name,"applicationCategory":"UtilitiesApplication","operatingSystem":"Any modern web browser","description":tool.description,"url":canonical,"offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}},
      {"@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":1,"name":"Home","item":BASE_URL},
        {"@type":"ListItem","position":2,"name":categoryFor(tool.mode),"item":urlFor(categoryPath(tool.mode))},
        {"@type":"ListItem","position":3,"name":tool.name,"item":canonical}
      ]}
    ]
  };
  await writePage("tools/" + tool.slug + "/index.html", shell({title:tool.title + " | FileDesk",description:tool.description,canonical,body,schema,keywords:[tool.name,...tool.keywords]}));
  addUrl("tools/" + tool.slug + "/");
}

for (const mode of ["pdf","images","text"]) {
  const relevant = tools.filter((tool) => tool.mode === mode);
  const path = categoryPath(mode);
  const title = categoryFor(mode) + " — Free Online Utilities | FileDesk";
  const description = "Browse free " + categoryFor(mode).toLowerCase() + " in FileDesk. " + relevant.map((tool) => tool.name).join(", ") + ".";
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
<p class="eyebrow">FileDesk tool collection</p><h1>${esc(categoryFor(mode))}</h1><p class="summary">${esc(description)}</p>
<div class="tool-grid">${relevant.map(toolCard).join("")}</div>
<p class="notice">All tools run in your browser. FileDesk does not upload selected documents to a processing server. Read the <a href="${urlFor("policies/privacy/")}">privacy policy</a> for hosting details and usage limits.</p>`;
  await writePage(path + "index.html", shell({title,description,canonical,body,schema}));
  addUrl(path);
}

{
  const title = "All PDF, Image, Text and File Tools | FileDesk";
  const description = "Browse the complete FileDesk directory of free browser-based PDF, image, text and data utilities.";
  const canonical = urlFor("tools/");
  const body = `<nav class="breadcrumbs"><a href="${BASE_URL}">Home</a><span>›</span><span>All tools</span></nav><p class="eyebrow">Complete directory</p><h1>All FileDesk tools</h1><p class="summary">${esc(description)}</p>
<h2>PDF tools</h2><div class="tool-grid">${tools.filter(t=>t.mode==="pdf").map(toolCard).join("")}</div>
<h2>Image tools</h2><div class="tool-grid">${tools.filter(t=>t.mode==="images").map(toolCard).join("")}</div>
<h2>Text and data tools</h2><div class="tool-grid">${tools.filter(t=>t.mode==="text").map(toolCard).join("")}</div>`;
  await writePage("tools/index.html",shell({title,description,canonical,body,schema:{"@context":"https://schema.org","@type":"ItemList","name":title,"url":canonical,"numberOfItems":tools.length,"itemListElement":tools.map((t,i)=>({"@type":"ListItem","position":i+1,"name":t.title,"url":urlFor("tools/"+t.slug+"/")}))}}));
  addUrl("tools/");
}

{
  const title = "About FileDesk — PDF, Image and File Tools";
  const description = "Learn about FileDesk, a free browser-based toolkit for everyday PDF, image, text and data tasks.";
  const canonical = urlFor("about/");
  const body = `<nav class="breadcrumbs"><a href="${BASE_URL}">Home</a><span>›</span><span>About</span></nav><p class="eyebrow">About the project</p><h1>FileDesk</h1><p class="summary">A straightforward collection of free tools for everyday PDFs, images, text and files.</p>
<h2>What FileDesk does</h2><p>FileDesk brings common file utilities into one small browser-based website. Choose a task, select a file or enter text, run the tool and download or copy the result.</p>
<h2>Local processing</h2><p>PDF, image and text processing happens inside your browser. Selected documents are not uploaded to a FileDesk processing server. The website itself is hosted by GitHub Pages, which may receive normal technical request metadata.</p>
<h2>Current tool categories</h2><ul><li>PDF: merge, split, extract pages, rotate, images to PDF and PDF to PNG.</li><li>Images: resize, convert and compress common still image formats.</li><li>Text and data: formatting, JSON, CSV, URL and Base64 conversion, percentage calculations and unit conversion.</li></ul>
<h2>What is not supported</h2><p>Encrypted PDFs, OCR, editing text inside existing PDFs, digital signatures, form filling, annotation editing and animated image processing are not supported. See each tool's page for more exact limits.</p><p><a href="${urlFor("tools/")}">Browse all tools</a>.</p>`;
  await writePage("about/index.html",shell({title,description,canonical,body,schema:{"@context":"https://schema.org","@type":"AboutPage","name":title,"description":description,"url":canonical}}));
  addUrl("about/");
}

{
  const title="Free PDF, Image, Text and File Tools | FileDesk";
  const lines=[
    "# FileDesk",
    "> Free browser-based tools for PDF, image, text and everyday file tasks. Selected files are processed locally in the browser, not uploaded to a FileDesk processing server.",
    "",
    "## Main website",
    "- " + BASE_URL,
    "- " + urlFor("tools/"),
    "- " + urlFor("about/"),
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
    "- Processing is performed locally in the browser; selected documents are not uploaded to a FileDesk server.",
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
