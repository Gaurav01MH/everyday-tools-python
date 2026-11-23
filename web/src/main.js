// Remove external tracking tags from the address bar without disturbing tool links.
{
  const currentUrl = new URL(window.location.href);
  const trackingSource = currentUrl.searchParams.get("utm_source") ?? currentUrl.searchParams.get("source") ?? "";
  if (/^chatgpt(?:\.com)?$/i.test(trackingSource)) {
    currentUrl.searchParams.delete("utm_source");
    currentUrl.searchParams.delete("source");
    window.history.replaceState(window.history.state, "", currentUrl.pathname + currentUrl.search + currentUrl.hash);
  }
}

import { assertInputFiles, formatBytes, MAX_TOTAL_BYTES } from "./lib/core.js";
import { runTextTool } from "./lib/text-tools.js";
import { TOOL_CATALOG } from "./lib/tool-catalog.js";

const $ = (selector) => document.querySelector(selector);
const elements = {
  tabs: [...document.querySelectorAll("[data-mode]")],
  workspaceTitle: $("#workspace-title"),
  workspaceDescription: $("#workspace-description"),
  operation: $("#operation"),
  fileSection: $("#file-section"),
  fileInput: $("#file-input"),
  fileHint: $("#file-hint"),
  dropZone: $("#drop-zone"),
  fileList: $("#file-list"),
  options: $("#options-section"),
  textSection: $("#text-section"),
  shareSecurity: $("#share-security"),
  turnstileContainer: $("#turnstile-container"),
  shareSecurityMessage: $("#share-security-message"),
  textInput: $("#text-input"),
  textExtraRow: $("#text-extra-row"),
  textExtraInput: $("#text-extra-input"),
  unitRow: $("#unit-row"),
  unitCategory: $("#unit-category"),
  unitFrom: $("#unit-from"),
  unitTo: $("#unit-to"),
  runButton: $("#run-button"),
  clearButton: $("#clear-button"),
  busyLabel: $("#busy-label"),
  form: $("#tool-form"),
  result: $("#result-section"),
  resultTitle: $("#result-title"),
  resultStatus: $("#result-status"),
  resultMessage: $("#result-message"),
  resultActions: $("#result-actions"),
  progress: $("#progress-bar"),
  privacyLink: $("#privacy-link"),
  privacyDialog: $("#privacy-dialog"),
  closeDialog: $("#close-dialog"),
  privacyBadge: $("#privacy-badge")
};

const definitions = {
  pdf: {
    title: "PDF tools",
    description: "Combine, split, rotate, extract, or render PDF pages.",
    operations: [
      ["merge", "Merge PDFs"],
      ["split", "Split into separate pages"],
      ["extract", "Extract selected pages"],
      ["rotate", "Rotate pages"],
      ["images-pdf", "Images to PDF"],
      ["render", "PDF pages to PNG"],
      ["compress-pdf", "Compress PDF"],
      ["organise-pdf", "Reorder / delete PDF pages"],
      ["page-numbers", "Add page numbers"],
      ["watermark", "Add text watermark"]
    ]
  },
  images: {
    title: "Image tools",
    description: "Resize, convert, and compress common image formats.",
    operations: [
      ["resize", "Resize images"],
      ["convert", "Convert image format"],
      ["compress", "Compress images"],
      ["metadata", "Remove image metadata"],
      ["id-photo", "Passport / ID photo size"]
    ]
  },
  text: {
    title: "Text & data",
    description: "Format text, convert data, validate JSON, and calculate values.",
    operations: [
      ["stats", "Text statistics"],
      ["upper", "Uppercase"],
      ["lower", "Lowercase"],
      ["title", "Title case"],
      ["sentence", "Sentence case"],
      ["clean", "Remove blank lines"],
      ["unique", "Remove duplicate lines"],
      ["json-format", "Format JSON"],
      ["json-validate", "Validate JSON"],
      ["csv-json", "CSV to JSON"],
      ["json-csv", "JSON to CSV"],
      ["url-encode", "URL encode"],
      ["url-decode", "URL decode"],
      ["base64-encode", "Base64 encode"],
      ["base64-decode", "Base64 decode"],
      ["percent-of", "Calculate percentage of a value"],
      ["percent-change", "Percentage change"],
      ["unit-convert", "Unit conversion"],
      ["link-tool", "Link Tool"],
      ["qr-tool", "QR Tool"]
    ]
  }
};

const units = {
  length: [["mm", "Millimetres"], ["cm", "Centimetres"], ["m", "Metres"], ["km", "Kilometres"], ["in", "Inches"], ["ft", "Feet"], ["yd", "Yards"], ["mi", "Miles"]],
  weight: [["mg", "Milligrams"], ["g", "Grams"], ["kg", "Kilograms"], ["oz", "Ounces"], ["lb", "Pounds"]],
  time: [["ms", "Milliseconds"], ["sec", "Seconds"], ["min", "Minutes"], ["hr", "Hours"], ["day", "Days"]],
  temperature: [["C", "Celsius"], ["F", "Fahrenheit"], ["K", "Kelvin"]]
};

let mode = "pdf";
let selectedFiles = [];
let busy = false;
let qrSvgObjectUrl = null;
let filePreviewUrls = [];
let previewRequest = 0;
let turnstileToken = "";
let turnstileWidgetId = null;
let turnstileScriptPromise = null;
const SHARE_API_ENABLED = import.meta.env.VITE_SHARE_API_ENABLED === "true";
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

function makeOption(value, text) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  return option;
}

function setMode(nextMode) {
  if (!definitions[nextMode]) return;
  mode = nextMode;
  for (const tab of elements.tabs) {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-pressed", String(active));
  }
  elements.workspaceTitle.textContent = definitions[mode].title;
  elements.workspaceDescription.textContent = definitions[mode].description;
  if (elements.privacyBadge) elements.privacyBadge.textContent = mode === "text" && ["link-tool", "qr-tool"].includes(currentOperation()) ? "Uploads to create a link" : "Stays on your device";
  elements.operation.replaceChildren(...definitions[mode].operations.map(([value, label]) => makeOption(value, label)));
  selectedFiles = [];
  renderFileList();
  updateOperation();
  clearResult();
  elements.textInput.value = "";
  elements.textExtraInput.value = "";
  updateTextControls();
}

function currentOperation() {
  return elements.operation.value;
}

function createField(labelText, inputElement, hint = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "field-row";
  const label = document.createElement("label");
  label.className = "field-label";
  label.textContent = labelText;
  label.htmlFor = inputElement.id;
  wrapper.append(label, inputElement);
  if (hint) {
    const small = document.createElement("span");
    small.className = "field-hint";
    small.textContent = hint;
    wrapper.append(small);
  }
  return wrapper;
}

function createInput(id, label, type = "text", value = "") {
  const input = document.createElement("input");
  input.id = id;
  input.type = type;
  input.value = value;
  input.autocomplete = "off";
  if (type === "number") {
    input.inputMode = "numeric";
    input.min = "1";
    input.max = "12000";
    input.step = "1";
  }
  return createField(label, input);
}

function createSelect(id, label, entries, initial) {
  const select = document.createElement("select");
  select.id = id;
  select.append(...entries.map(([value, text]) => makeOption(value, text)));
  if (initial) select.value = initial;
  return createField(label, select);
}

function createCheck(id, label, checked = true) {
  const wrapper = document.createElement("label");
  wrapper.className = "check-field";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.checked = checked;
  const text = document.createElement("span");
  text.textContent = label;
  wrapper.append(input, text);
  return wrapper;
}

function updateOperation() {
  const operation = currentOperation();
  const isText = mode === "text";
  const isFile = mode !== "text";
  const isShareTool = mode === "text" && ["link-tool", "qr-tool"].includes(operation);
  elements.textSection.hidden = !isText;
  elements.fileSection.hidden = !isFile && !isShareTool;
  elements.shareSecurity.hidden = !isShareTool;
  elements.operation.closest(".field-row").hidden = false;
  elements.fileInput.multiple = isShareTool || operation === "id-photo" || operation === "organise-pdf" || operation === "compress-pdf" || operation === "page-numbers" || operation === "watermark" ? false : ["merge", "images-pdf"].includes(operation) || mode === "images";
  elements.fileInput.accept = isShareTool ? "" : mode === "pdf"
    ? operation === "images-pdf" ? "image/png,image/jpeg,image/webp,image/bmp,.png,.jpg,.jpeg,.webp,.bmp" : ".pdf,application/pdf"
    : "image/png,image/jpeg,image/webp,image/bmp,.png,.jpg,.jpeg,.webp,.bmp";
  elements.fileHint.textContent = isShareTool ? "One file · Up to 10 MB" : mode === "pdf"
    ? operation === "images-pdf" ? "PNG, JPG, WEBP or BMP · Up to 20 images" : operation === "merge" ? "PDF files · Up to 12 files" : "PDF files · One file at a time"
    : "PNG, JPG, WEBP or BMP · Up to 20 images";
  elements.dropZone.querySelector(".drop-subtitle").textContent = isShareTool
    ? "Or paste text below. One file or text per share link."
    : "Your files are read locally in this tab.";
  elements.fileInput.required = isFile;
  elements.options.replaceChildren();
  if (isShareTool) {
    const note = document.createElement("p");
    note.className = "inline-note";
    note.textContent = "Your share URL is public to anyone who has it and expires after seven days. Uploads are limited to 10 MB.";
    elements.options.append(note);
  }

  if (mode === "pdf") {
    if (operation === "extract" || operation === "rotate") {
      elements.options.append(createInput("page-selection", "Pages", "text", "all"));
      $("#page-selection").placeholder = "all, or for example 1, 3-5";
      $("#page-selection").inputMode = "text";
      if (operation === "rotate") {
        elements.options.append(createSelect("rotation-angle", "Rotation", [["90", "90° clockwise"], ["180", "180°"], ["270", "270° clockwise"]], "90"));
      }
    }
    if (operation === "render") {
      elements.options.append(createSelect("render-scale", "Image size", [["0.5", "Small"], ["1", "Normal"], ["1.5", "Large"], ["2", "Extra large"]], "1"));
    }
    if (operation === "organise-pdf") {
      elements.options.append(createInput("page-order", "Page order to keep", "text", "all"));
      $("#page-order").placeholder = "Example: 3, 1, 2, 5 — omitted pages are deleted";
      const note = document.createElement("p");
      note.className = "inline-note";
      note.textContent = "Review the thumbnails, then enter page numbers in the order you want. Leave out any page you want to remove.";
      elements.options.append(note);
      const preview = document.createElement("div");
      preview.id = "page-preview";
      preview.className = "page-preview";
      preview.setAttribute("aria-live", "polite");
      elements.options.append(preview);
      if (selectedFiles[0]) void renderPagePreviews(selectedFiles[0]);
    }
    if (operation === "compress-pdf") {
      const note = document.createElement("p");
      note.className = "inline-note";
      note.textContent = "Optimises PDF structure and metadata. Embedded images are not recompressed, so savings vary.";
      elements.options.append(note);
    }
    if (operation === "page-numbers") {
      elements.options.append(createInput("page-start", "Starting number", "number", "1"));
    }
    if (operation === "watermark") {
      elements.options.append(createInput("watermark-text", "Watermark text", "text", "CONFIDENTIAL"));
      $("#watermark-text").maxLength = 80;
    }
    if (operation === "merge") {
      const note = document.createElement("p");
      note.className = "inline-note";
      note.textContent = "The file order below is the order pages will be combined. Use the arrows to change it.";
      elements.options.append(note);
    }
  } else if (mode === "images") {
    if (operation === "id-photo") {
      elements.options.append(createSelect("id-photo-preset", "Photo size preset", [
        ["413x531", "35 × 45 mm (413 × 531 px)"],
        ["413x591", "35 × 50 mm (413 × 591 px)"],
        ["600x600", "2 × 2 inches (600 × 600 px)"]
      ], "413x531"));
    }
    if (operation === "resize" || operation === "id-photo") {
      const row = document.createElement("div");
      row.className = "two-column-fields";
      const preset = operation === "id-photo" ? "413x531" : "1200x1200";
      const [defaultWidth, defaultHeight] = preset.split("x");
      row.append(
        createInput("image-width", "Width (px)", "number", defaultWidth),
        createInput("image-height", "Height (px)", "number", defaultHeight)
      );
      elements.options.append(row);
      if (operation === "resize") elements.options.append(createCheck("keep-aspect", "Keep original proportions", true));
      else {
        const note = document.createElement("p");
        note.className = "inline-note";
        note.textContent = "The full photo is fitted inside a white frame without stretching or automatic face cropping. Verify the exact authority requirements.";
        elements.options.append(note);
        $("#id-photo-preset").addEventListener("change", (event) => {
          const [w, h] = event.target.value.split("x");
          $("#image-width").value = w;
          $("#image-height").value = h;
        });
      }
    }
    if (operation !== "metadata") {
      elements.options.append(createSelect("image-format", "Output format", operation === "compress" || operation === "id-photo" ? [
        ["image/jpeg", "JPG"], ["image/webp", "WEBP"]
      ] : [
        ["image/jpeg", "JPG"], ["image/png", "PNG"], ["image/webp", "WEBP"]
      ], operation === "compress" || operation === "id-photo" ? "image/jpeg" : "image/png"));
    } else {
      const note = document.createElement("p");
      note.className = "inline-note";
      note.textContent = "The image is re-exported through the browser canvas to remove common EXIF and location metadata. The original is unchanged.";
      elements.options.append(note);
    }
    if (operation === "compress") {
      elements.options.append(createInput("image-quality", "Quality (10–95)", "number", "82"));
      $("#image-quality").min = "10";
      $("#image-quality").max = "95";
      elements.options.append(createInput("target-size-kb", "Optional target size (KB)", "number", "100"));
      $("#target-size-kb").min = "5";
      $("#target-size-kb").max = "10240";
      const note = document.createElement("p");
      note.className = "inline-note";
      note.textContent = "Target size is best-effort. The tool lowers quality and may reduce dimensions to get closer.";
      elements.options.append(note);
    }
    if (operation === "resize") {
      const note = document.createElement("p");
      note.className = "inline-note";
      note.textContent = "Dimensions are maximum bounds when proportions are kept. JPG output uses a white background for transparent areas.";
      elements.options.append(note);
    }
  } else {
    const needsExtra = ["percent-of", "percent-change", "link-make"].includes(operation);
    elements.textExtraRow.hidden = !needsExtra;
    elements.unitRow.hidden = operation !== "unit-convert";
    const inputLabel = elements.textSection.querySelector('label[for="text-input"]');
    inputLabel.textContent = ["link-tool", "qr-tool"].includes(operation) ? "Text to share (optional when a file is selected)" :
      operation === "percent-of" ? "Percentage" :
      operation === "percent-change" ? "Starting value" :
      operation === "link-make" ? "Website URL" :
      operation === "qr-code" ? "Text or URL" :
      operation === "unit-convert" ? "Value" :
      operation === "stats" ? "Text to analyse" : "Input";
    elements.textExtraRow.querySelector("label").textContent = operation === "percent-of" ? "Value" :
      operation === "link-make" ? "Link text (optional)" : "New value";
    elements.textExtraInput.placeholder = operation === "percent-of" ? "Number to calculate from" :
      operation === "link-make" ? "Example: Open Files Format" : "New value";
    elements.textInput.placeholder = ["link-tool", "qr-tool"].includes(operation) ? "Paste the text you want to share" :
      operation === "unit-convert" ? "Enter a number" :
      operation === "link-make" ? "https://example.com" :
      operation === "qr-code" ? "Paste a URL or short text" :
      operation === "percent-of" ? "Percentage" :
      operation === "percent-change" ? "Starting value" :
      operation.startsWith("json") ? "Paste JSON here" :
      operation === "csv-json" ? "Paste CSV here" : "Paste or type your text here";
    if (operation === "qr-code") {
      const note = document.createElement("p");
      note.className = "inline-note";
      note.textContent = "QR codes are generated on this device. The encoded text is not uploaded.";
      elements.options.append(note);
    }
    if (operation === "unit-convert") updateUnitOptions();
    if (["link-tool", "qr-tool"].includes(operation)) {
      elements.runButton.textContent = operation === "link-tool" ? "Create share link" : "Create share link and QR";
      void prepareTurnstileWidget();
    }
  }
  elements.runButton.textContent = isText ? (operation === "link-tool" ? "Create share link" : operation === "qr-tool" ? "Create share link and QR" : operation === "qr-code" ? "Generate QR code" : "Process text") : "Run tool";
}

async function renderPagePreviews(file) {
  const container = $("#page-preview");
  if (!container) return;
  const request = ++previewRequest;
  try {
    const { renderPdfThumbnails } = await import("./lib/pdf-preview.js");
    if (request === previewRequest && $("#page-preview")) await renderPdfThumbnails(file, $("#page-preview"));
  } catch {
    if (container.isConnected) container.textContent = "Page thumbnails could not be loaded in this browser.";
  }
}

function updateUnitOptions() {
  const category = elements.unitCategory.value;
  const entries = units[category];
  const fromPrevious = elements.unitFrom.value;
  const toPrevious = elements.unitTo.value;
  elements.unitFrom.replaceChildren(...entries.map(([value, label]) => makeOption(value, `${label} (${value})`)));
  elements.unitTo.replaceChildren(...entries.map(([value, label]) => makeOption(value, `${label} (${value})`)));
  elements.unitFrom.value = entries.some(([value]) => value === fromPrevious) ? fromPrevious : entries[0][0];
  elements.unitTo.value = entries.some(([value]) => value === toPrevious) ? toPrevious : entries[1][0];
}

function updateTextControls() {
  if (mode !== "text") return;
  const operation = currentOperation();
  const isShareTool = ["link-tool", "qr-tool"].includes(operation);
  const needsExtra = ["percent-of", "percent-change", "link-make"].includes(operation);
  elements.textExtraRow.hidden = !needsExtra;
  elements.unitRow.hidden = operation !== "unit-convert";

  const inputLabel = elements.textSection.querySelector('label[for="text-input"]');
  inputLabel.textContent = isShareTool ? "Text to share (optional when a file is selected)" :
    operation === "percent-of" ? "Percentage" :
    operation === "percent-change" ? "Starting value" :
    operation === "link-make" ? "Website URL" :
    operation === "qr-code" ? "Text or URL" :
    operation === "unit-convert" ? "Value" :
    operation === "stats" ? "Text to analyse" : "Input";

  elements.textExtraRow.querySelector("label").textContent =
    operation === "percent-of" ? "Value" :
    operation === "link-make" ? "Link text (optional)" : "New value";
  elements.textExtraInput.placeholder = operation === "percent-of" ? "Number to calculate from" :
    operation === "link-make" ? "Example: Open Files Format" : "New value";

  elements.textInput.placeholder = isShareTool ? "Paste the text you want to share" :
    operation === "unit-convert" ? "Enter a number" :
    operation === "link-make" ? "https://example.com" :
    operation === "qr-code" ? "Paste a URL or short text" :
    operation === "percent-of" ? "Enter a percentage" :
    operation === "percent-change" ? "Enter the starting value" :
    operation.startsWith("json") ? "Paste JSON here" :
    operation === "csv-json" ? "Paste CSV here" : "Paste or type your text here";

  elements.runButton.textContent = operation === "link-tool" ? "Create share link" :
    operation === "qr-tool" ? "Create share link and QR" :
    operation === "qr-code" ? "Generate QR code" : "Process text";

  if (operation === "unit-convert") updateUnitOptions();
}

function renderFileList() {
  filePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  filePreviewUrls = [];
  elements.fileList.replaceChildren();
  selectedFiles.forEach((file, index) => {
    const item = document.createElement("li");
    item.className = "file-item";
    const mergeMode = mode === "pdf" && currentOperation() === "merge";
    item.draggable = mergeMode && !busy;
    if (item.draggable) {
      item.addEventListener("dragstart", (event) => { event.dataTransfer.setData("text/plain", String(index)); event.dataTransfer.effectAllowed = "move"; });
      item.addEventListener("dragover", (event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; });
      item.addEventListener("drop", (event) => { event.preventDefault(); const from = Number(event.dataTransfer.getData("text/plain")); const to = index; if (Number.isInteger(from) && from !== to && from >= 0 && from < selectedFiles.length) { const [moved] = selectedFiles.splice(from, 1); selectedFiles.splice(to, 0, moved); renderFileList(); } });
    }
    const details = document.createElement("div");
    details.className = "file-details";
    const name = document.createElement("span");
    name.className = "file-name";
    name.textContent = file.name;
    name.title = file.name;
    const size = document.createElement("span");
    size.className = "file-size";
    size.textContent = formatBytes(file.size);
    if (file.type.startsWith("image/")) {
      const preview = document.createElement("img");
      const previewUrl = URL.createObjectURL(file);
      filePreviewUrls.push(previewUrl);
      preview.className = "file-thumbnail";
      preview.src = previewUrl;
      preview.alt = "";
      preview.setAttribute("aria-hidden", "true");
      details.append(preview);
    } else if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const preview = document.createElement("span");
      preview.className = "file-type-thumbnail";
      preview.textContent = "PDF";
      preview.setAttribute("aria-hidden", "true");
      details.append(preview);
    }
    details.append(name, size);
    const controls = document.createElement("div");
    controls.className = "file-controls";

    if (mode === "pdf" && currentOperation() === "merge") {
      const up = document.createElement("button");
      up.type = "button";
      up.className = "small-button";
      up.textContent = "↑";
      up.setAttribute("aria-label", `Move ${file.name} up`);
      up.disabled = index === 0 || busy;
      up.addEventListener("click", () => moveFile(index, -1));
      const down = document.createElement("button");
      down.type = "button";
      down.className = "small-button";
      down.textContent = "↓";
      down.setAttribute("aria-label", `Move ${file.name} down`);
      down.disabled = index === selectedFiles.length - 1 || busy;
      down.addEventListener("click", () => moveFile(index, 1));
      controls.append(up, down);
    }
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "small-button remove-button";
    remove.textContent = "Remove";
    remove.disabled = busy;
    remove.addEventListener("click", () => {
      selectedFiles.splice(index, 1);
      renderFileList();
    });
    controls.append(remove);
    item.append(details, controls);
    elements.fileList.append(item);
  });
  const total = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  if (selectedFiles.length) {
    const summary = document.createElement("li");
    summary.className = "file-summary";
    summary.textContent = `${selectedFiles.length} file(s) · ${formatBytes(total)} total`;
    elements.fileList.append(summary);
  }
}

function moveFile(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= selectedFiles.length) return;
  [selectedFiles[index], selectedFiles[target]] = [selectedFiles[target], selectedFiles[index]];
  renderFileList();
}

function addFiles(files) {
  if (busy) return;
  const newFiles = [...files];
  const isShareTool = mode === "text" && ["link-tool", "qr-tool"].includes(currentOperation());
  if (isShareTool) {
    selectedFiles = newFiles.slice(0, 1);
    if (selectedFiles[0]?.size > 10 * 1024 * 1024) {
      selectedFiles = [];
      showMessage("Each shared file is limited to 10 MB.", "error");
    } else {
      if (selectedFiles.length) elements.textInput.value = "";
      clearResult();
    }
    renderFileList();
    return;
  }
  const singleInputOperation = mode === "pdf" && !["merge", "images-pdf"].includes(currentOperation());
  selectedFiles = singleInputOperation ? newFiles.slice(0, 1) : [...selectedFiles, ...newFiles];
  if (selectedFiles.length > 20) {
    selectedFiles = selectedFiles.slice(0, 20);
    showMessage("Choose no more than 20 files at a time.", "error");
  }
  const total = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_TOTAL_BYTES) {
    selectedFiles = [];
    showMessage("The selected files exceed the 100 MB total limit.", "error");
  } else {
    clearResult();
  }
  renderFileList();
  if (mode === "pdf" && currentOperation() === "organise-pdf" && selectedFiles[0]) void renderPagePreviews(selectedFiles[0]);
}

function clearResult() {
  if (qrSvgObjectUrl) {
    URL.revokeObjectURL(qrSvgObjectUrl);
    qrSvgObjectUrl = null;
  }
  elements.result.hidden = true;
  elements.resultTitle.textContent = "Ready";
  elements.resultStatus.textContent = "";
  elements.resultMessage.textContent = "";
  elements.resultActions.replaceChildren();
  elements.progress.hidden = true;
  elements.progress.value = 0;
}

function showMessage(message, status = "success") {
  elements.result.hidden = false;
  elements.resultTitle.textContent = status === "error" ? "Could not finish" : "Done";
  elements.resultStatus.textContent = status === "error" ? "Check input" : status === "warning" ? "Partial result" : "Completed";
  elements.resultStatus.className = `result-status ${status === "error" ? "status-error" : status === "warning" ? "status-warning" : "status-success"}`;
  elements.resultMessage.textContent = message;
  elements.progress.hidden = true;
  if (status !== "error" && !elements.resultActions.querySelector("[data-process-another]")) {
    const another = document.createElement("button");
    another.type = "button";
    another.className = "secondary-button";
    another.textContent = "Process another file";
    another.dataset.processAnother = "true";
    another.addEventListener("click", () => { clearWorkspace(); elements.fileSection.scrollIntoView({ block: "nearest" }); });
    elements.resultActions.append(another);
  }
}

function setBusy(value) {
  busy = value;
  elements.runButton.disabled = value;
  elements.clearButton.disabled = value;
  elements.operation.disabled = value;
  if (elements.privacyBadge) elements.privacyBadge.textContent = mode === "text" && ["link-tool", "qr-tool"].includes(currentOperation()) ? "Uploads to create a link" : "Stays on your device";
  elements.fileInput.disabled = value;
  elements.textInput.disabled = value;
  elements.textExtraInput.disabled = value;
  elements.busyLabel.hidden = !value;
  renderFileList();
}

function updateProgress(value, message) {
  elements.result.hidden = false;
  elements.resultTitle.textContent = "Working";
  elements.resultStatus.textContent = `${Math.round(value)}%`;
  elements.resultStatus.className = "result-status";
  elements.resultMessage.textContent = message;
  elements.progress.hidden = false;
  elements.progress.value = value;
}

function showTextResult(value) {
  const output = document.createElement("textarea");
  output.className = "output-text";
  output.readOnly = true;
  output.rows = Math.min(16, Math.max(5, String(value).split("\n").length));
  output.value = value;
  output.setAttribute("aria-label", "Processed output");
  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "secondary-button";
  copy.textContent = "Copy result";
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(output.value);
      copy.textContent = "Copied";
    } catch {
      output.focus();
      output.select();
      showMessage("Select the result and copy it with Ctrl+C.", "error");
    }
  });
  elements.resultActions.replaceChildren(output, copy);
}

async function runPdf(operation) {
  const files = selectedFiles;
  assertInputFiles(files);
  const onProgress = updateProgress;
  const pdf = await import("./lib/pdf-tools.js");
  const advanced = ["compress-pdf", "organise-pdf", "page-numbers", "watermark"].includes(operation)
    ? await import("./lib/advanced-pdf-tools.js") : null;
  switch (operation) {
    case "merge":
      if (files.length < 2) throw new Error("Choose at least two PDFs to merge.");
      if (files.some((file) => !/\.pdf$/i.test(file.name) && file.type !== "application/pdf")) throw new Error("Merge accepts PDF files only.");
      await pdf.mergePdfs(files, onProgress);
      break;
    case "split": await pdf.splitPdf(files[0], onProgress); break;
    case "extract": await pdf.extractPdfPages(files[0], $("#page-selection").value, onProgress); break;
    case "rotate": await pdf.rotatePdf(files[0], $("#page-selection").value, $("#rotation-angle").value, onProgress); break;
    case "images-pdf": await pdf.imagesToPdf(files, onProgress); break;
    case "render": await pdf.renderPdf(files[0], $("#render-scale").value, onProgress); break;
    case "compress-pdf": return await advanced.compressPdf(files[0], onProgress);
    case "organise-pdf": return await advanced.organisePdf(files[0], $("#page-order").value, onProgress);
    case "page-numbers": return await advanced.addPageNumbers(files[0], $("#page-start").value, onProgress);
    case "watermark": return await advanced.watermarkPdf(files[0], $("#watermark-text").value, onProgress);
    default: throw new Error("Choose a valid PDF task.");
  }
  return null;
}

async function runImage(operation) {
  assertInputFiles(selectedFiles);
  const { processImages } = await import("./lib/image-tools.js");
  const width = $("#image-width")?.value;
  const height = $("#image-height")?.value;
  const quality = Number($("#image-quality")?.value ?? 82);
  if (operation === "compress" && (!Number.isInteger(quality) || quality < 10 || quality > 95)) throw new Error("Image quality must be an integer from 10 to 95.");
  const targetKB = Number($("#target-size-kb")?.value ?? 0);
  if (operation === "compress" && targetKB && (!Number.isFinite(targetKB) || targetKB < 5 || targetKB > 10240)) throw new Error("Choose a target size between 5 KB and 10,240 KB.");
  const result = await processImages(selectedFiles, operation, {
    width, height,
    keepAspect: $("#keep-aspect")?.checked ?? true,
    format: $("#image-format")?.value ?? "image/jpeg",
    quality,
    targetKB
  }, updateProgress);
  return result;
}

async function runText(operation) {
  const options = {
    category: elements.unitCategory.value,
    from: elements.unitFrom.value,
    to: elements.unitTo.value
  };
  const result = runTextTool(operation, elements.textInput.value, elements.textExtraInput.value, options);
  showTextResult(result);
  showMessage("Your result is ready. Nothing was sent to a server.", "success");
}

async function runQrCode() {
  const { default: QRCode } = await import("qrcode");
  const value = elements.textInput.value.trim();
  if (!value) throw new Error("Enter a URL or text to encode.");
  if (new TextEncoder().encode(value).length > 1000) {
    throw new Error("Keep QR content to 1,000 UTF-8 bytes or fewer for reliable scanning.");
  }
  const options = {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 320,
    color: { dark: "#000000", light: "#ffffff" }
  };
  const [pngDataUrl, svgMarkup] = await Promise.all([
    QRCode.toDataURL(value, options),
    QRCode.toString(value, { ...options, type: "svg" })
  ]);
  if (qrSvgObjectUrl) URL.revokeObjectURL(qrSvgObjectUrl);
  qrSvgObjectUrl = URL.createObjectURL(new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" }));

  const preview = document.createElement("img");
  preview.className = "qr-preview";
  preview.src = pngDataUrl;
  preview.alt = "Generated QR code preview";

  const pngLink = document.createElement("a");
  pngLink.className = "secondary-button";
  pngLink.href = pngDataUrl;
  pngLink.download = "files-format-qr-code.png";
  pngLink.textContent = "Download PNG";

  const svgLink = document.createElement("a");
  svgLink.className = "secondary-button";
  svgLink.href = qrSvgObjectUrl;
  svgLink.download = "files-format-qr-code.svg";
  svgLink.textContent = "Download SVG";

  elements.resultActions.replaceChildren(preview, pngLink, svgLink);
  showMessage("QR code generated in your browser. The encoded text was not sent to a server.", "success");
}

async function ensureTurnstileScript() {
  if (window.turnstile) return;
  if (!TURNSTILE_SITE_KEY) throw new Error("The free sharing service is not configured yet. The site owner must finish the Cloudflare setup.");
  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-turnstile-loader]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => reject(new Error("Could not load the security check.")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.turnstileLoader = "true";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Could not load the security check."));
      document.head.append(script);
    });
  }
  await turnstileScriptPromise;
}

async function prepareTurnstileWidget() {
  if (!elements.shareSecurity || elements.shareSecurity.hidden) return;
  if (!SHARE_API_ENABLED || !TURNSTILE_SITE_KEY) {
    elements.shareSecurityMessage.textContent = "Sharing is disabled on this fallback address. The free Cloudflare Pages version will enable it after the storage and security settings are connected.";
    elements.turnstileContainer.hidden = true;
    return;
  }
  try {
    await ensureTurnstileScript();
    if (turnstileWidgetId !== null) return;
    turnstileWidgetId = window.turnstile.render(elements.turnstileContainer, {
      sitekey: TURNSTILE_SITE_KEY,
      action: "share-upload",
      theme: "light",
      callback(token) {
        turnstileToken = token;
        elements.shareSecurityMessage.textContent = "Security check complete.";
      },
      "expired-callback"() {
        turnstileToken = "";
        elements.shareSecurityMessage.textContent = "Security check expired. Complete it again before uploading.";
      },
      "error-callback"() {
        turnstileToken = "";
        elements.shareSecurityMessage.textContent = "The security check had an error. Reload the check and retry.";
      }
    });
  } catch (error) {
    elements.shareSecurityMessage.textContent = error.message;
  }
}

async function runShareTool(kind) {
  if (!SHARE_API_ENABLED) {
    throw new Error("The share-link service is available on the free Cloudflare Pages address after its storage and security setup. This GitHub Pages fallback cannot host uploaded files.");
  }
  if (!TURNSTILE_SITE_KEY || !turnstileToken) {
    throw new Error("Complete the security check before creating a share link.");
  }

  let body;
  let filename;
  let contentKind;
  if (selectedFiles.length) {
    const file = selectedFiles[0];
    if (file.size > 10 * 1024 * 1024) throw new Error("Each shared file is limited to 10 MB.");
    body = file;
    filename = file.name;
    contentKind = "file";
  } else {
    const value = elements.textInput.value;
    if (!value.trim()) throw new Error("Choose one file or paste the text you want to share.");
    body = new TextEncoder().encode(value);
    if (body.byteLength > 10 * 1024 * 1024) throw new Error("Pasted text is limited to 10 MB.");
    filename = "shared-text.txt";
    contentKind = "text";
  }

  const accepted = window.confirm("Upload warning: the selected file or pasted text will be sent to Files Format storage to create a shareable link. Anyone with the link can download it for up to 7 days. Do not share private or sensitive material. Continue?");
  if (!accepted) return;
  setBusy(true);
  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "X-Share-Kind": contentKind,
        "X-Share-Filename": encodeURIComponent(filename),
        "X-Turnstile-Token": turnstileToken
      },
      body
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "The share link could not be created.");
    const shareUrl = new URL(payload.url, location.origin);
    if (shareUrl.origin !== location.origin || !/^\/s\/[a-f0-9]{48}$/.test(shareUrl.pathname)) {
      throw new Error("The share service returned an invalid link. Please retry.");
    }

    const urlLink = document.createElement("a");
    urlLink.href = shareUrl.href;
    urlLink.textContent = shareUrl.href;
    urlLink.target = "_blank";
    urlLink.rel = "noopener noreferrer";
    urlLink.className = "share-url";
    urlLink.setAttribute("aria-label", "Shareable download link");

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "secondary-button";
    copyButton.textContent = "Copy share link";
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(shareUrl.href);
        showMessage("Share link copied. Anyone with the link can download it until it expires.", "success");
      } catch {
        showMessage("Select and copy the share URL shown above.", "warning");
      }
    });

    const expiry = document.createElement("p");
    expiry.className = "inline-note";
    expiry.textContent = "This link expires in 7 days. Anyone who has it can download the shared content.";

    if (kind === "qr") {
      const { default: QRCode } = await import("qrcode");
      const qrOptions = { errorCorrectionLevel: "M", margin: 4, width: 320, color: { dark: "#000000", light: "#ffffff" } };
      const [pngDataUrl, svgMarkup] = await Promise.all([
        QRCode.toDataURL(shareUrl.href, qrOptions),
        QRCode.toString(shareUrl.href, { ...qrOptions, type: "svg" })
      ]);
      if (qrSvgObjectUrl) URL.revokeObjectURL(qrSvgObjectUrl);
      qrSvgObjectUrl = URL.createObjectURL(new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" }));
      const preview = document.createElement("img");
      preview.className = "qr-preview";
      preview.src = pngDataUrl;
      preview.alt = "QR code for the shareable download link";
      const pngLink = document.createElement("a");
      pngLink.href = pngDataUrl;
      pngLink.download = "files-format-share-qr.png";
      pngLink.className = "secondary-button";
      pngLink.textContent = "Download QR (PNG)";
      const svgLink = document.createElement("a");
      svgLink.href = qrSvgObjectUrl;
      svgLink.download = "files-format-share-qr.svg";
      svgLink.className = "secondary-button";
      svgLink.textContent = "Download QR (SVG)";
      elements.resultActions.replaceChildren(preview, urlLink, copyButton, pngLink, svgLink, expiry);
    } else {
      elements.resultActions.replaceChildren(urlLink, copyButton, expiry);
    }

    showMessage("Your share link is ready.", "success");
  } finally {
    turnstileToken = "";
    if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
    if (elements.shareSecurityMessage) {
      elements.shareSecurityMessage.textContent = "Complete the security check again for another upload.";
    }
    setBusy(false);
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  if (busy) return;
  clearResult();
  if (mode === "text") {
    try {
      if (currentOperation() === "link-tool") await runShareTool("link");
      else if (currentOperation() === "qr-tool") await runShareTool("qr");
      else if (currentOperation() === "qr-code") await runQrCode();
      else await runText(currentOperation());
    } catch (error) {
      showMessage(error.message || "The text could not be processed.", "error");
    }
    return;
  }

  setBusy(true);
  elements.result.hidden = false;
  elements.progress.hidden = false;
  elements.progress.value = 0;
  try {
    const output = mode === "pdf" ? await runPdf(currentOperation()) : await runImage(currentOperation());
    if (output && Number.isFinite(output.before) && Number.isFinite(output.after)) {
      const saved = output.before - output.after;
      const summary = `Original: ${formatBytes(output.before)} · New: ${formatBytes(output.after)} · ${saved > 0 ? `Saved ${formatBytes(saved)}` : saved < 0 ? `Increased by ${formatBytes(Math.abs(saved))}` : "No size change"}.`;
      const targetMissed = output.targetBytes && output.after > output.targetBytes;
      const notSmaller = currentOperation() === "compress-pdf" && !output.reduced;
      showMessage(summary + (targetMissed ? ` The requested ${formatBytes(output.targetBytes)} target was not reached; the closest available result was downloaded.` : ""), targetMissed || notSmaller ? "warning" : "success");
    } else if (output?.stats?.length) {
      const lines = output.stats.map((item) => `${item.name}: ${formatBytes(item.before)} → ${formatBytes(item.after)}${item.targetBytes && item.after > item.targetBytes ? " (target not reached)" : ""}`);
      const summary = lines.join("\n");
      const missed = output.stats.some((item) => item.targetBytes && item.after > item.targetBytes);
      showMessage(summary + (output.failures.length ? `\n${output.failures.length} file(s) failed.` : ""), missed || output.failures.length ? "warning" : "success");
    } else if (output?.failures?.length) {
      showMessage(`Downloaded ${output.succeeded} file(s). ${output.failures.length} could not be processed: ${output.failures.join("\n")}`, "warning");
    } else {
      showMessage("Your download is ready. Source files were not changed.", "success");
    }
  } catch (error) {
    showMessage(error.message || "The file could not be processed.", "error");
  } finally {
    setBusy(false);
  }
}

function clearWorkspace() {
  if (busy) return;
  selectedFiles = [];
  renderFileList();
  elements.textInput.value = "";
  elements.textExtraInput.value = "";
  clearResult();
}

elements.tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
elements.textInput.addEventListener("input", () => {
  if (mode === "text" && ["link-tool", "qr-tool"].includes(currentOperation()) && elements.textInput.value.length && selectedFiles.length) {
    selectedFiles = [];
    renderFileList();
  }
});
elements.operation.addEventListener("change", () => {
  selectedFiles = [];
  renderFileList();
  updateOperation();
  updateTextControls();
  clearResult();
});
elements.unitCategory.addEventListener("change", updateUnitOptions);
elements.fileInput.addEventListener("change", (event) => {
  addFiles(event.target.files);
  event.target.value = "";
});
elements.dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  if (!busy) elements.dropZone.classList.add("is-dragging");
});
elements.dropZone.addEventListener("dragleave", () => elements.dropZone.classList.remove("is-dragging"));
elements.dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.dropZone.classList.remove("is-dragging");
  if (busy) return;
  addFiles(event.dataTransfer?.files ?? []);
});
elements.form.addEventListener("submit", handleSubmit);
elements.clearButton.addEventListener("click", clearWorkspace);
elements.privacyLink.addEventListener("click", (event) => {
  event.preventDefault();
  if (typeof elements.privacyDialog.showModal === "function") elements.privacyDialog.showModal();
});
elements.closeDialog.addEventListener("click", () => elements.privacyDialog.close());
elements.privacyDialog.addEventListener("click", (event) => {
  if (event.target === elements.privacyDialog) elements.privacyDialog.close();
});

setMode("pdf");
const pathSlug = location.pathname.split("/").filter(Boolean).at(-1);
const requestedToolSlug = new URLSearchParams(location.search).get("tool") || (TOOL_CATALOG.some((tool) => tool.slug === pathSlug) ? pathSlug : null);
if (requestedToolSlug) {
  const requestedTool = TOOL_CATALOG.find((tool) => tool.slug === requestedToolSlug);
  if (requestedTool) {
    const heroTitle = document.querySelector(".intro h1");
    const heroCopy = document.querySelector(".intro-copy");
    if (heroTitle) heroTitle.textContent = requestedTool.title;
    if (heroCopy) heroCopy.textContent = requestedTool.description;
    setMode(requestedTool.mode);
    elements.operation.value = requestedTool.operation;
    updateOperation();
    updateTextControls();
    if (requestedTool.operation === "qr-tool") {
      const fragmentParams = new URLSearchParams(location.hash.slice(1).split("&").slice(1).join("&"));
      const prefill = fragmentParams.get("share");
      if (prefill !== null) {
        elements.textInput.value = prefill;
        document.querySelector("#workspace").scrollIntoView({ block: "start" });
        history.replaceState(null, "", location.pathname + location.search + "#workspace");
      }
    }
  } else {
    const cleanedUrl = new URL(location.href);
    cleanedUrl.searchParams.delete("tool");
    history.replaceState(null, "", cleanedUrl.pathname + cleanedUrl.hash);
  }
}

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    const baseUrl = new URL(import.meta.env.BASE_URL, location.origin);
    const workerUrl = new URL("sw.js", baseUrl).toString();
    navigator.serviceWorker.register(workerUrl, { scope: baseUrl.pathname })
      .catch(() => {
        const note = document.querySelector(".privacy-note");
        if (note) note.title = "Offline caching is unavailable in this browser session.";
      });
  });
}
