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
    task = pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const pdf = await task.promise;
    const orderInput = document.querySelector("#page-order");
    const visiblePages = Math.min(pdf.numPages, 100);
    const canReorder = pdf.numPages <= 100;
    const grid = document.createElement("div");
    grid.className = "page-thumbnail-grid";
    grid.setAttribute("aria-label", "PDF page thumbnails");

    function syncOrder() {
      const cards = [...grid.querySelectorAll(".page-thumbnail")];
      if (orderInput && canReorder) {
        const order = cards.map(card => card.dataset.pageNumber);
        const isOriginal = order.length === pdf.numPages && order.every((v, i) => Number(v) === i + 1);
        orderInput.value = isOriginal ? "all" : order.join(", ");
      }
      cards.forEach((card, index) => {
        const earlier = card.querySelector('[data-action="earlier"]');
        const later = card.querySelector('[data-action="later"]');
        const remove = card.querySelector('[data-action="remove"]');
        if (earlier) earlier.disabled = index === 0;
        if (later) later.disabled = index === cards.length - 1;
        if (remove) remove.disabled = cards.length === 1;
      });
    }

    for (let number = 1; number <= visiblePages; number += 1) {
      const page = await pdf.getPage(number);
      const viewport = page.getViewport({ scale: 0.22 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("The browser could not prepare page previews.");
      await page.render({ canvasContext: context, viewport }).promise;
      const card = document.createElement("figure");
      card.className = "page-thumbnail";
      card.dataset.pageNumber = String(number);
      card.draggable = canReorder;
      canvas.setAttribute("aria-label", "Preview of PDF page " + number);
      const caption = document.createElement("figcaption");
      caption.textContent = "Page " + number;
      card.append(canvas, caption);

      if (canReorder) {
        const controls = document.createElement("div");
        controls.className = "page-thumbnail-controls";
        const addButton = (label, action, callback) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "page-thumbnail-control";
          button.textContent = label;
          button.setAttribute("aria-label", action + " page " + number);
          button.dataset.action = action;
          button.addEventListener("click", callback);
          return button;
        };
        controls.append(
          addButton("↑", "Move earlier", () => {
            const previous = card.previousElementSibling;
            if (previous) grid.insertBefore(card, previous);
            syncOrder();
          }),
          addButton("↓", "Move later", () => {
            const next = card.nextElementSibling;
            if (next) grid.insertBefore(next, card);
            syncOrder();
          }),
          addButton("Remove", "Remove", () => {
            if (grid.children.length > 1) {
              card.remove();
              syncOrder();
            }
          })
        );
        card.append(controls);
        card.addEventListener("dragstart", event => {
          event.dataTransfer.setData("text/plain", card.dataset.pageNumber);
          event.dataTransfer.effectAllowed = "move";
          card.classList.add("is-moving");
        });
        card.addEventListener("dragend", () => card.classList.remove("is-moving"));
        card.addEventListener("dragover", event => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        });
        card.addEventListener("drop", event => {
          event.preventDefault();
          const id = event.dataTransfer.getData("text/plain");
          const dragged = [...grid.children].find(node => node.dataset.pageNumber === id);
          if (!dragged || dragged === card) return;
          const bounds = card.getBoundingClientRect();
          if (event.clientY > bounds.top + bounds.height / 2) grid.insertBefore(dragged, card.nextElementSibling);
          else grid.insertBefore(dragged, card);
          syncOrder();
        });
      }
      grid.append(card);
      page.cleanup();
    }
    container.replaceChildren(grid);
    const note = document.createElement("p");
    note.className = "inline-note";
    note.textContent = pdf.numPages > 100
      ? "Showing the first 100 of " + pdf.numPages + " pages. Use the page-order field above for pages outside this preview."
      : "Drag pages or use the buttons to reorder them. Remove pages you do not need; the page-order field updates automatically.";
    container.append(note);
    syncOrder();
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
