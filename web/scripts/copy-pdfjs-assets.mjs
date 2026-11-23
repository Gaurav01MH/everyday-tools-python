import { copyFile, cp, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));

export async function copyPdfJsAssets(destination) {
  const pdfjsSource = join(webRoot, "node_modules", "pdfjs-dist");
  await mkdir(destination, { recursive: true });
  for (const folder of ["cmaps", "iccs", "image_decoders", "standard_fonts", "wasm"]) {
    await cp(join(pdfjsSource, folder), join(destination, folder), {
      recursive: true,
      force: true
    });
  }
  await copyFile(join(pdfjsSource, "LICENSE"), join(destination, "LICENSE"));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const destination = process.argv[2] ? resolve(process.argv[2]) : join(webRoot, "public", "pdfjs");
  await copyPdfJsAssets(destination);
  console.log("Copied PDF.js support assets to " + destination);
}
