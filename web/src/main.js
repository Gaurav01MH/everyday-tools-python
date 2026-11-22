import { assertInputFiles, formatBytes, MAX_TOTAL_BYTES } from "./lib/core.js";
import { mergePdfs, splitPdf, extractPdfPages, rotatePdf, imagesToPdf, renderPdf } from "./lib/pdf-tools.js";
import { processImages } from "./lib/image-tools.js";
import { runTextTool } from "./lib/text-tools.js";

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
  closeDialog: $("#close-dialog")
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
      ["render", "PDF pages to PNG"]
    ]
  },
  images: {
    title: "Image tools",
    description: "Resize, convert, and compress common image formats.",
    operations: [
      ["resize", "Resize images"],
      ["convert", "Convert image format"],
      ["compress", "Compress images"]
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
      ["unit-convert", "Unit conversion"]
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
  elements.textSection.hidden = !isText;
  elements.fileSection.hidden = !isFile;
  elements.operation.closest(".field-row").hidden = false;
  elements.fileInput.multiple = ["merge", "images-pdf"].includes(operation) || mode === "images";
  elements.fileInput.accept = mode === "pdf"
    ? operation === "images-pdf" ? "image/png,image/jpeg,image/webp,image/bmp,.png,.jpg,.jpeg,.webp,.bmp" : ".pdf,application/pdf"
    : "image/png,image/jpeg,image/webp,image/bmp,.png,.jpg,.jpeg,.webp,.bmp";
  elements.fileHint.textContent = mode === "pdf"
    ? operation === "images-pdf" ? "PNG, JPG, WEBP or BMP · Up to 20 images" : operation === "merge" ? "PDF files · Up to 12 files" : "PDF files · One file at a time"
    : "PNG, JPG, WEBP or BMP · Up to 20 images";
  elements.fileInput.required = isFile;
  elements.options.replaceChildren();

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
    if (operation === "merge") {
      const note = document.createElement("p");
      note.className = "inline-note";
      note.textContent = "The file order below is the order pages will be combined. Use the arrows to change it.";
      elements.options.append(note);
    }
  } else if (mode === "images") {
    if (operation === "resize") {
      const row = document.createElement("div");
      row.className = "two-column-fields";
      row.append(
        createInput("image-width", "Maximum width (px)", "number", "1200"),
        createInput("image-height", "Maximum height (px)", "number", "1200")
      );
      elements.options.append(row, createCheck("keep-aspect", "Keep original proportions", true));
    }
    elements.options.append(createSelect("image-format", "Output format", operation === "compress" ? [
      ["image/jpeg", "JPG"], ["image/webp", "WEBP"]
    ] : [
      ["image/jpeg", "JPG"], ["image/png", "PNG"], ["image/webp", "WEBP"]
    ], operation === "compress" ? "image/jpeg" : "image/png"));
    if (operation === "compress") {
      elements.options.append(createInput("image-quality", "Quality (10–95)", "number", "82"));
      $("#image-quality").min = "10";
      $("#image-quality").max = "95";
    }
    if (operation === "resize") {
      const note = document.createElement("p");
      note.className = "inline-note";
      note.textContent = "Dimensions are maximum bounds when proportions are kept. JPG output uses a white background for transparent areas.";
      elements.options.append(note);
    }
  } else {
    const needsExtra = operation === "percent-of" || operation === "percent-change";
    elements.textExtraRow.hidden = !needsExtra;
    elements.unitRow.hidden = operation !== "unit-convert";
    const inputLabel = elements.textSection.querySelector('label[for="text-input"]');
    inputLabel.textContent = operation === "percent-of" ? "Percentage" : operation === "percent-change" ? "Starting value" : operation === "unit-convert" ? "Value" : operation === "stats" ? "Text to analyse" : "Input";
    if (operation === "unit-convert") elements.textInput.placeholder = "Enter a number";
    if (needsExtra) {
      elements.textExtraRow.querySelector("label").textContent = operation === "percent-of" ? "Value" : "New value";
      elements.textInput.placeholder = operation === "percent-of" ? "Percentage" : "Starting value";
      elements.textExtraInput.placeholder = operation === "percent-of" ? "Number to calculate from" : "New value";
    } else {
      elements.textInput.placeholder = operation.startsWith("json") ? "Paste JSON here" : operation === "csv-json" ? "Paste CSV here" : "Paste or type your text here";
    }
    if (operation === "unit-convert") updateUnitOptions();
  }
  elements.runButton.textContent = isText ? "Process text" : "Run tool";
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
  const needsExtra = operation === "percent-of" || operation === "percent-change";
  elements.textExtraRow.hidden = !needsExtra;
  elements.unitRow.hidden = operation !== "unit-convert";
  const inputLabel = elements.textSection.querySelector('label[for="text-input"]');
  inputLabel.textContent = operation === "percent-of" ? "Percentage" :
    operation === "percent-change" ? "Starting value" :
    operation === "unit-convert" ? "Value" :
    operation === "stats" ? "Text to analyse" : "Input";
  elements.textInput.placeholder = operation === "unit-convert" ? "Enter a number" :
    operation === "percent-of" ? "Enter a percentage" :
    operation === "percent-change" ? "Enter the starting value" :
    operation.startsWith("json") ? "Paste JSON here" :
    operation === "csv-json" ? "Paste CSV here" : "Paste or type your text here";
  if (operation === "unit-convert") updateUnitOptions();
}

function renderFileList() {
  elements.fileList.replaceChildren();
  selectedFiles.forEach((file, index) => {
    const item = document.createElement("li");
    item.className = "file-item";
    const details = document.createElement("div");
    details.className = "file-details";
    const name = document.createElement("span");
    name.className = "file-name";
    name.textContent = file.name;
    name.title = file.name;
    const size = document.createElement("span");
    size.className = "file-size";
    size.textContent = formatBytes(file.size);
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
}

function clearResult() {
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
}

function setBusy(value) {
  busy = value;
  elements.runButton.disabled = value;
  elements.clearButton.disabled = value;
  elements.operation.disabled = value;
  elements.fileInput.disabled = value;
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
  assertInputFiles(files, { min: operation === "merge" || operation === "images-pdf" ? 1 : 1 });
  const onProgress = updateProgress;
  switch (operation) {
    case "merge":
      if (files.length < 2) throw new Error("Choose at least two PDFs to merge.");
      if (files.some((file) => !/\.pdf$/i.test(file.name) && file.type !== "application/pdf")) {
        throw new Error("Merge accepts PDF files only.");
      }
      await mergePdfs(files, onProgress);
      break;
    case "split":
      await splitPdf(files[0], onProgress);
      break;
    case "extract":
      await extractPdfPages(files[0], $("#page-selection").value, onProgress);
      break;
    case "rotate":
      await rotatePdf(files[0], $("#page-selection").value, $("#rotation-angle").value, onProgress);
      break;
    case "images-pdf":
      await imagesToPdf(files, onProgress);
      break;
    case "render":
      await renderPdf(files[0], $("#render-scale").value, onProgress);
      break;
    default:
      throw new Error("Choose a valid PDF task.");
  }
}

async function runImage(operation) {
  assertInputFiles(selectedFiles);
  const width = $("#image-width")?.value;
  const height = $("#image-height")?.value;
  const quality = Number($("#image-quality")?.value ?? 82);
  if (operation === "compress" && (!Number.isInteger(quality) || quality < 10 || quality > 95)) {
    throw new Error("Image quality must be an integer from 10 to 95.");
  }
  const result = await processImages(selectedFiles, operation, {
    width,
    height,
    keepAspect: $("#keep-aspect")?.checked ?? true,
    format: $("#image-format").value,
    quality
  }, updateProgress);
  if (result.failures.length) {
    return `Downloaded ${result.succeeded} image(s). ${result.failures.length} could not be processed:\n${result.failures.join("\n")}`;
  }
  return "";
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

async function handleSubmit(event) {
  event.preventDefault();
  if (busy) return;
  clearResult();
  if (mode === "text") {
    try {
      await runText(currentOperation());
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
    let warning = "";
    if (mode === "pdf") await runPdf(currentOperation());
    else warning = await runImage(currentOperation());
    showMessage(warning || "Your download is ready. Source files were not changed.", warning ? "warning" : "success");
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
