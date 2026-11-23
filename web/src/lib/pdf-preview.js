import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function renderPdfThumbnails(file, container) {
  container.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "inline-note";
  loading.textContent = "Preparing page previews…";
  container.append(loading);
  let task;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    task = pdfjsLib.getDocument({ data: bytes });
    const pdf = await task.promise;
    if (pdf.numPages > 100) throw new Error("Preview is limited to the first 100 pages.");
    const grid = document.createElement("div");
    grid.className = "page-thumbnail-grid";
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 0.22 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("The browser could not prepare page previews.");
      await page.render({ canvasContext: context, viewport }).promise;
      const card = document.createElement("figure");
      card.className = "page-thumbnail";
      canvas.setAttribute("aria-label", `Preview of PDF page ${pageNumber}`);
      const caption = document.createElement("figcaption");
      caption.textContent = `Page ${pageNumber}`;
      card.append(canvas, caption);
      grid.append(card);
      page.cleanup();
    }
    container.replaceChildren(grid);
  } catch (error) {
    const message = document.createElement("p");
    message.className = "inline-note";
    message.textContent = error.message || "Page previews are unavailable for this PDF.";
    container.replaceChildren(message);
  } finally {
    if (task) {
      try { await task.destroy(); } catch {}
    }
  }
}
