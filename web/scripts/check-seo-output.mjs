import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { TOOL_CATALOG } from "../src/lib/tool-catalog.js";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/").pop() || "files-format";
const basePath = process.env.PUBLIC_BASE_PATH || (process.env.GITHUB_PAGES === "true" ? "/" + repositoryName + "/" : "/");
const defaultSiteOrigin = process.env.GITHUB_REPOSITORY_OWNER
  ? "https://" + process.env.GITHUB_REPOSITORY_OWNER + ".github.io"
  : "https://files-format.example";
const origin = (process.env.PUBLIC_SITE_ORIGIN || defaultSiteOrigin).replace(/\/$/, "");
const baseUrl = new URL(basePath.endsWith("/") ? basePath : basePath + "/", origin).href;
const read = (path) => readFile(join(dist, path), "utf8");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));
const sitemap = await read("sitemap.xml");
const robots = await read("robots.txt");
const llms = await read("llms.txt");
const home = await read("index.html");
const brandedAlias = await read("too-broke-for-a-custom-domain/index.html");

assert.match(home, /<title>Files Format/);
assert.match(home, /name="description"/);
assert.match(home, /application\/ld\+json/);
assert.match(home, /PDF and image tools that never upload your files/);
assert.match(home, /DevTools/);
assert.match(home, /tool-card-grid/);
assert.match(home, /og-files-format\.png/);
assert.equal(brandedAlias, home, "Branded GitHub Pages alias should match the homepage");
assert.match(robots, /User-agent: \*/);
assert.ok(robots.includes("Sitemap: " + baseUrl + "sitemap.xml"));
assert.ok(llms.includes("Files Format"));
assert.ok(llms.includes("Individual tools"));

const requiredPages = [
  "tools/","about/","pdf-tools/","image-tools/","text-tools/","guides/",
  "guides/merge-pdf-without-uploading/","policies/privacy/","policies/terms/",
  "policies/licensing/","feedback/"
];
for (const path of requiredPages) {
  await access(join(dist,path,"index.html"));
  assert.ok(sitemap.includes("<loc>" + baseUrl + path + "</loc>"), "Missing sitemap entry: " + path);
}
assert.ok(!sitemap.includes(baseUrl + "connect/"), "Unavailable AI connector must not be indexed");
assert.match(await read("connect/index.html"), /noindex/);

for (const tool of TOOL_CATALOG) {
  const direct = await read(tool.slug + "/index.html");
  const canonical = baseUrl + tool.slug + "/";
  const title = escapeHtml(tool.title + " | Files Format");
  assert.ok(direct.includes("<title>" + title + "</title>"), "Missing unique title: " + tool.slug);
  assert.ok(direct.includes('name="description" content="' + escapeHtml(tool.description) + '"'), "Missing unique meta description: " + tool.slug);
  assert.ok(direct.includes(">" + escapeHtml(tool.title) + "</h1>"), "Missing unique H1: " + tool.slug);
  assert.ok(direct.includes('rel="canonical" href="' + canonical + '"'), "Wrong canonical: " + tool.slug);
  assert.ok(direct.includes('property="og:title" content="' + escapeHtml(title) + '"'), "Missing OG title: " + tool.slug);
  assert.ok(direct.includes('property="og:description" content="' + escapeHtml(tool.description) + '"'), "Missing OG description: " + tool.slug);
  assert.ok(direct.includes('property="og:url" content="' + canonical + '"'), "Missing OG URL: " + tool.slug);
  assert.ok(direct.includes('property="og:image" content="' + baseUrl + 'og-files-format.png"'), "Missing OG PNG: " + tool.slug);
  assert.ok(direct.includes('name="twitter:card" content="summary_large_image"'), "Missing Twitter large card: " + tool.slug);
  assert.ok(direct.includes("Frequently asked questions"), "Missing FAQ: " + tool.slug);
  assert.ok(direct.includes('type="application/ld+json"'), "Missing FAQ structured data: " + tool.slug);
  assert.ok(sitemap.includes("<loc>" + canonical + "</loc>"), "Missing direct sitemap route: " + tool.slug);

  const detail = await read("tools/" + tool.slug + "/index.html");
  assert.ok(detail.includes('rel="canonical" href="' + canonical + '"'), "Secondary detail path must canonicalise to direct route: " + tool.slug);
}

for (const [path,width,height] of [
  ["og-files-format.png",1200,630],
  ["icons/icon-192.png",192,192],
  ["icons/icon-512.png",512,512],
  ["icons/apple-touch-icon.png",180,180]
]) {
  const bytes = await readFile(join(dist,path));
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10],"Invalid PNG signature: " + path);
  assert.equal(bytes.readUInt32BE(16),width,"Incorrect PNG width: " + path);
  assert.equal(bytes.readUInt32BE(20),height,"Incorrect PNG height: " + path);
}
console.log("SEO checks passed for " + TOOL_CATALOG.length + " direct tool routes and " + requiredPages.length + " supporting pages.");
