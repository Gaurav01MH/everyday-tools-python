import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const distRoot = join(webRoot, "dist");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile() && entry.name !== "sw.js") files.push(path);
  }
  return files;
}

// Ship PDF.js support data locally. PDF character maps, standard fonts,
 // ICC profiles, and WASM decoders must be available offline and same-origin.
const pdfjsSource = join(webRoot, "node_modules", "pdfjs-dist");
const pdfjsDestination = join(distRoot, "pdfjs");
await mkdir(pdfjsDestination, { recursive: true });
for (const folder of ["cmaps", "iccs", "standard_fonts", "wasm"]) {
  await cp(join(pdfjsSource, folder), join(pdfjsDestination, folder), {
    recursive: true,
    force: true
  });
}

const files = (await walk(distRoot)).sort();
if (!files.some((path) => relative(distRoot, path) === "index.html")) {
  throw new Error("The Vite build did not produce dist/index.html.");
}

const hash = createHash("sha256");
const relativeFiles = [];
for (const path of files) {
  const rel = relative(distRoot, path).split(sep).join("/");
  relativeFiles.push(rel);
  hash.update(rel);
  hash.update(await readFile(path));
}
const version = hash.digest("hex").slice(0, 16);
const precacheJson = JSON.stringify(relativeFiles, null, 2);

const generated = [
  'const CACHE_PREFIX = "everyday-tools-";',
  'const CACHE_NAME = CACHE_PREFIX + "' + version + '";',
  'const APP_ROOT = new URL("./", self.location.href).pathname;',
  "const PRECACHE_FILES = " + precacheJson + ";",
  "",
  'self.addEventListener("install", (event) => {',
  "  event.waitUntil((async () => {",
  "    const cache = await caches.open(CACHE_NAME);",
  '    const urls = [APP_ROOT, ...PRECACHE_FILES.map((file) => new URL(file, new URL("./", self.location.href)).href)];',
  "    await cache.addAll(urls);",
  "    await self.skipWaiting();",
  "  })());",
  "});",
  "",
  'self.addEventListener("activate", (event) => {',
  "  event.waitUntil((async () => {",
  "    const keys = await caches.keys();",
  "    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));",
  "    await self.clients.claim();",
  "  })());",
  "});",
  "",
  'self.addEventListener("fetch", (event) => {',
  "  const request = event.request;",
  '  if (request.method !== "GET") return;',
  "  const url = new URL(request.url);",
  "  if (url.origin !== self.location.origin || !url.pathname.startsWith(APP_ROOT)) return;",
  "  event.respondWith((async () => {",
  "    const cache = await caches.open(CACHE_NAME);",
  "    const cached = await cache.match(request);",
  "    if (cached) return cached;",
  "    try {",
  "      const response = await fetch(request);",
  '      if (response.ok && response.type === "basic") await cache.put(request, response.clone());',
  "      return response;",
  "    } catch (error) {",
  '      if (request.mode === "navigate") {',
  "        const fallback = await cache.match(APP_ROOT);",
  "        if (fallback) return fallback;",
  "      }",
  "      throw error;",
  "    }",
  "  })());",
  "});",
  ""
].join("\n");

await writeFile(join(distRoot, "sw.js"), generated, "utf8");
console.log("Generated an offline service worker with " + relativeFiles.length + " pre-cached assets.");
