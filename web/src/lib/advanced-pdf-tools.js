import { assertInputFiles, MAX_PDF_PAGES, MAX_SINGLE_PDF_BYTES, MAX_TOTAL_OUTPUT_BYTES, parsePageSelection, safeFilename } from "./core.js";

function report(onProgress, value, message) {
  if (typeof onProgress === "function") onProgress(Math.max(0, Math.min(100, value)), message);
}

async function loadPdf(file) {
  assertInputFiles([file]);
  if (file.size > MAX_SINGLE_PDF_BYTES) {
    throw new Error("This PDF is larger than 50 MB. Choose a smaller file.");
  }
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
    throw new Error("Choose a PDF file.");
  }
  const { PDFDocument } = await import("pdf-lib");
  let document;
  try {
    document = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  } catch {
    throw new Error("This PDF could not be opened. It may be damaged or password-protected.");
  }
  if (!document.getPageCount() || document.getPageCount() > MAX_PDF_PAGES) {
    throw new Error("This PDF must contain between 1 and 250 pages.");
  }
  return { document, PDFDocument };
}

function savePdf(bytes, file, suffix, onProgress) {
  if (bytes.byteLength > MAX_TOTAL_OUTPUT_BYTES) {
    throw new Error("The finished PDF is larger than the 100 MB download limit.");
  }
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFilename(file.name)}-${suffix}.pdf`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  report(onProgress, 100, "Your PDF download is ready.");
  return { before: file.size, after: bytes.byteLength };
}

export async function compressPdf(file, onProgress) {
  const { document } = await loadPdf(file);
  report(onProgress, 35, "Optimising the PDF structure…");
  // Object streams and metadata cleanup can reduce structural overhead. Embedded
  // images are not recompressed, so the result is measured rather than promised.
  document.setTitle("");
  document.setAuthor("");
  document.setSubject("");
  document.setKeywords([]);
  document.setCreator("Files Format");
  document.setProducer("Files Format");
  const bytes = await document.save({ useObjectStreams: true, objectsPerTick: 50 });
  const result = savePdf(bytes, file, "compressed", onProgress);
  return { ...result, reduced: result.after < result.before };
}

export async function organisePdf(file, pageOrder, onProgress) {
  const { document, PDFDocument } = await loadPdf(file);
  const indexes = parsePageSelection(pageOrder, document.getPageCount());
  if (!indexes.length) throw new Error("Enter at least one page to keep.");
  const output = await PDFDocument.create();
  const pages = await output.copyPages(document, indexes);
  pages.forEach((page) => output.addPage(page));
  report(onProgress, 75, "Rebuilding the PDF in the requested order…");
  const bytes = await output.save({ useObjectStreams: true });
  return savePdf(bytes, file, "organised", onProgress);
}

export async function addPageNumbers(file, startAt, onProgress) {
  const { document } = await loadPdf(file);
  const start = Number(startAt);
  if (!Number.isInteger(start) || start < 1 || start > 999999) {
    throw new Error("Choose a starting page number between 1 and 999,999.");
  }
  const { StandardFonts, rgb } = await import("pdf-lib");
  const font = await document.embedFont(StandardFonts.Helvetica);
  const pages = document.getPages();
  pages.forEach((page, index) => {
    const label = String(start + index);
    const { width } = page.getSize();
    page.drawText(label, {
      x: Math.max(20, width - 44),
      y: 18,
      size: 10,
      font,
      color: rgb(0.25, 0.25, 0.25)
    });
    report(onProgress, Math.round((index + 1) / pages.length * 85), `Numbered page ${index + 1} of ${pages.length}`);
  });
  return savePdf(await document.save({ useObjectStreams: true }), file, "numbered", onProgress);
}

export async function watermarkPdf(file, text, onProgress) {
  const watermark = String(text ?? "").trim().slice(0, 80);
  if (!watermark) throw new Error("Enter watermark text first.");
  const { document } = await loadPdf(file);
  const { StandardFonts, rgb, degrees } = await import("pdf-lib");
  const font = await document.embedFont(StandardFonts.HelveticaBold);
  const pages = document.getPages();
  pages.forEach((page, index) => {
    const { width, height } = page.getSize();
    const size = Math.max(24, Math.min(60, width / Math.max(5, watermark.length * 0.55)));
    const textWidth = font.widthOfTextAtSize(watermark, size);
    page.drawText(watermark, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size,
      font,
      color: rgb(0.55, 0.55, 0.55),
      opacity: 0.18,
      rotate: degrees(-35)
    });
    report(onProgress, Math.round((index + 1) / pages.length * 85), `Watermarked page ${index + 1} of ${pages.length}`);
  });
  return savePdf(await document.save({ useObjectStreams: true }), file, "watermarked", onProgress);
}
