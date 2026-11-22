import { PDFDocument, degrees } from "pdf-lib";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { assertInputFiles, MAX_PDF_PAGES, MAX_IMAGE_PIXELS, parsePageSelection, safeFilename } from "./core.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function report(onProgress, value, message) {
  if (typeof onProgress === "function") onProgress(Math.max(0, Math.min(100, value)), message);
}

async function readPdf(file) {
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    throw new Error(`"${file.name}" is not a PDF file.`);
  }
  const bytes = await file.arrayBuffer();
  try {
    const document = await PDFDocument.load(bytes, { updateMetadata: false });
    if (document.getPageCount() > MAX_PDF_PAGES) {
      throw new Error(`"${file.name}" has more than ${MAX_PDF_PAGES} pages. This browser tool has a page limit.`);
    }
    return { document, bytes };
  } catch (error) {
    if (error.message?.includes("more than")) throw error;
    throw new Error(`Could not read "${file.name}". It may be damaged, unsupported, or password-protected.`);
  }
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function downloadZip(entries, filename, onProgress) {
  const zip = new JSZip();
  for (const entry of entries) zip.file(entry.name, entry.bytes);
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 1 } }, (meta) => {
    report(onProgress, 90 + Math.round(meta.percent / 10), "Creating download…");
  });
  saveBlob(blob, filename);
  return entries.length;
}

export async function mergePdfs(files, onProgress) {
  assertInputFiles(files, { min: 2 });
  if (files.length > 12) throw new Error("Merge up to 12 PDFs at a time.");
  const output = await PDFDocument.create();
  let pagesDone = 0;

  for (let i = 0; i < files.length; i += 1) {
    const { document } = await readPdf(files[i]);
    const count = document.getPageCount();
    if (pagesDone + count > MAX_PDF_PAGES) throw new Error(`The merged PDF would exceed ${MAX_PDF_PAGES} pages.`);
    const copied = await output.copyPages(document, document.getPageIndices());
    for (const page of copied) output.addPage(page);
    pagesDone += count;
    report(onProgress, Math.round((i + 1) / files.length * 85), `Added ${files[i].name}`);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const bytes = await output.save();
  saveBlob(new Blob([bytes], { type: "application/pdf" }), "merged.pdf");
  report(onProgress, 100, "Merged PDF downloaded.");
  return pagesDone;
}

export async function splitPdf(file, onProgress) {
  assertInputFiles([file]);
  const { document } = await readPdf(file);
  const entries = [];
  const total = document.getPageCount();
  for (let i = 0; i < total; i += 1) {
    const pageDoc = await PDFDocument.create();
    const [page] = await pageDoc.copyPages(document, [i]);
    pageDoc.addPage(page);
    entries.push({ name: `page-${String(i + 1).padStart(3, "0")}.pdf`, bytes: await pageDoc.save() });
    report(onProgress, Math.round((i + 1) / total * 85), `Preparing page ${i + 1} of ${total}`);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const count = await downloadZip(entries, `${safeFilename(file.name)}-pages.zip`, onProgress);
  report(onProgress, 100, "Split pages downloaded.");
  return count;
}

export async function extractPdfPages(file, selection, onProgress) {
  assertInputFiles([file]);
  const { document } = await readPdf(file);
  const indexes = parsePageSelection(selection, document.getPageCount());
  const output = await PDFDocument.create();
  const copied = await output.copyPages(document, indexes);
  copied.forEach((page) => output.addPage(page));
  const bytes = await output.save();
  saveBlob(new Blob([bytes], { type: "application/pdf" }), `${safeFilename(file.name)}-selected-pages.pdf`);
  report(onProgress, 100, `Downloaded ${indexes.length} selected page(s).`);
  return indexes.length;
}

export async function rotatePdf(file, selection, angle, onProgress) {
  assertInputFiles([file]);
  const degreesValue = Number(angle);
  if (![90, 180, 270].includes(degreesValue)) throw new Error("Choose 90, 180, or 270 degrees.");
  const { document } = await readPdf(file);
  const indexes = parsePageSelection(selection, document.getPageCount());
  const pages = document.getPages();
  for (const index of indexes) pages[index].setRotation(degrees(degreesValue));
  const bytes = await document.save();
  saveBlob(new Blob([bytes], { type: "application/pdf" }), `${safeFilename(file.name)}-rotated.pdf`);
  report(onProgress, 100, `Rotated ${indexes.length} page(s).`);
  return indexes.length;
}

async function fileToJpeg(file) {
  if (file.size > 30 * 1024 * 1024) throw new Error(`"${file.name}" is larger than 30 MB.`);
  const supported = /\.(png|jpe?g|webp|bmp)$/i.test(file.name);
  if (!supported) throw new Error(`"${file.name}" is not a supported still image. Use PNG, JPG, WEBP, or BMP.`);
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bitmap = await createImageBitmap(file);
  }
  try {
    const pixels = bitmap.width * bitmap.height;
    if (!bitmap.width || !bitmap.height || pixels > MAX_IMAGE_PIXELS) {
      throw new Error(`"${file.name}" is too large in pixel dimensions.`);
    }
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("The browser could not create an image canvas.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Could not convert an image.")), "image/jpeg", 0.92);
    });
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    bitmap.close();
  }
}

export async function imagesToPdf(files, onProgress) {
  assertInputFiles(files);
  const output = await PDFDocument.create();
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 28;

  for (let i = 0; i < files.length; i += 1) {
    const jpegBytes = await fileToJpeg(files[i]);
    const image = await output.embedJpg(jpegBytes);
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;
    const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const page = output.addPage([pageWidth, pageHeight]);
    page.drawImage(image, { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height });
    report(onProgress, Math.round((i + 1) / files.length * 85), `Added ${files[i].name}`);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const bytes = await output.save();
  saveBlob(new Blob([bytes], { type: "application/pdf" }), "images.pdf");
  report(onProgress, 100, "PDF downloaded.");
  return files.length;
}

export async function renderPdf(file, scale, onProgress) {
  assertInputFiles([file]);
  const renderScale = Number(scale);
  if (!Number.isFinite(renderScale) || renderScale < 0.5 || renderScale > 2) {
    throw new Error("Choose a render scale between 0.5 and 2.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  let loadingTask;
  try {
    loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    if (pdf.numPages > 100) throw new Error("This renderer is limited to 100 pages at a time.");
    const entries = [];
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      const viewport = page.getViewport({ scale: renderScale });
      const pixels = Math.ceil(viewport.width) * Math.ceil(viewport.height);
      if (pixels > 20_000_000) throw new Error(`Page ${number} is too large to render at this scale. Try a lower scale.`);
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("The browser could not create a rendering canvas.");
      await page.render({ canvasContext: context, viewport }).promise;
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error(`Could not export page ${number}.`)), "image/png");
      });
      entries.push({ name: `page-${String(number).padStart(3, "0")}.png`, bytes: new Uint8Array(await blob.arrayBuffer()) });
      page.cleanup();
      canvas.width = 1;
      canvas.height = 1;
      report(onProgress, Math.round(number / pdf.numPages * 85), `Rendered page ${number} of ${pdf.numPages}`);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    await pdf.destroy();
    const count = await downloadZip(entries, `${safeFilename(file.name)}-pages-png.zip`, onProgress);
    report(onProgress, 100, "Page images downloaded.");
    return count;
  } catch (error) {
    if (loadingTask) {
      try { await loadingTask.destroy(); } catch {}
    }
    if (error?.name === "PasswordException") {
      throw new Error("Password-protected PDFs are not supported.");
    }
    throw error;
  }
}
