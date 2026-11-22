import JSZip from "jszip";
import { assertInputFiles, MAX_IMAGE_PIXELS, safeFilename } from "./core.js";

const ACCEPTED_INPUT = /\.(png|jpe?g|webp|bmp)$/i;
const ACCEPTED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/bmp"]);
const OUTPUT_FORMATS = new Set(["image/png", "image/jpeg", "image/webp"]);

function outputName(file, extension) {
  return `${safeFilename(file.name)}.${extension}`;
}

async function decodeImage(file) {
  if (file.size > 30 * 1024 * 1024) throw new Error(`"${file.name}" is larger than 30 MB.`);
  if (!ACCEPTED_INPUT.test(file.name) && !ACCEPTED_MIME.has(file.type)) {
    throw new Error(`"${file.name}" is unsupported. Use still PNG, JPG, WEBP, or BMP images.`);
  }
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > MAX_IMAGE_PIXELS) {
      bitmap.close();
      throw new Error(`"${file.name}" exceeds the safe image dimensions.`);
    }
    return bitmap;
  } catch (error) {
    if (error.message?.includes("exceeds")) throw error;
    throw new Error(`The browser could not decode "${file.name}". It may be damaged or use an unsupported encoding.`);
  }
}

function canvasFor(bitmap, width, height, format, quality) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: format !== "image/jpeg" });
  if (!context) throw new Error("The browser could not create an image canvas.");
  if (format === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      canvas.width = 1;
      canvas.height = 1;
      if (!blob) reject(new Error("Image conversion failed. Try a smaller image."));
      else if (blob.type !== format) reject(new Error(`This browser cannot create ${format.slice(6).toUpperCase()} images.`));
      else resolve(blob);
    }, format, quality);
  });
}

async function processOne(file, operation, options) {
  const bitmap = await decodeImage(file);
  try {
    let width = bitmap.width;
    let height = bitmap.height;
    if (operation === "resize") {
      const maxWidth = Number(options.width);
      const maxHeight = Number(options.height);
      if (!Number.isInteger(maxWidth) || maxWidth < 1 || maxWidth > 12000 ||
          !Number.isInteger(maxHeight) || maxHeight < 1 || maxHeight > 12000) {
        throw new Error("Enter image dimensions between 1 and 12,000 pixels.");
      }
      const scale = options.keepAspect
        ? Math.min(maxWidth / width, maxHeight / height)
        : null;
      if (scale !== null) {
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
      } else {
        width = maxWidth;
        height = maxHeight;
      }
    }

    const format = options.format;
    if (!OUTPUT_FORMATS.has(format)) throw new Error("Choose PNG, JPG, or WEBP as the output format.");
    if (width * height > MAX_IMAGE_PIXELS) throw new Error("The requested output dimensions are too large.");
    const quality = Math.max(0.1, Math.min(0.95, Number(options.quality) / 100 || 0.82));
    const blob = await canvasFor(bitmap, width, height, format, quality);
    const extension = format === "image/jpeg" ? "jpg" : format.slice("image/".length);
    return { name: outputName(file, extension), blob };
  } finally {
    bitmap.close();
  }
}

export async function processImages(files, operation, options, onProgress) {
  assertInputFiles(files);
  if (!["resize", "convert", "compress"].includes(operation)) throw new Error("Choose a valid image operation.");
  const results = [];
  const failures = [];
  const usedNames = new Set();

  for (let i = 0; i < files.length; i += 1) {
    try {
      const result = await processOne(files[i], operation, options);
      let name = result.name;
      let suffix = 2;
      while (usedNames.has(name.toLocaleLowerCase())) {
        const dot = result.name.lastIndexOf(".");
        name = `${result.name.slice(0, dot)}-${suffix}${result.name.slice(dot)}`;
        suffix += 1;
      }
      usedNames.add(name.toLocaleLowerCase());
      results.push({ ...result, name });
    } catch (error) {
      failures.push(`${files[i].name}: ${error.message}`);
    }
    if (typeof onProgress === "function") onProgress(Math.round((i + 1) / files.length * 85), `Processed ${i + 1} of ${files.length}`);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (!results.length) throw new Error(failures.join("\n") || "No image could be processed.");
  if (results.length === 1) {
    const result = results[0];
    const url = URL.createObjectURL(result.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } else {
    const zip = new JSZip();
    for (const result of results) zip.file(result.name, result.blob);
    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 1 } });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "processed-images.zip";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  if (typeof onProgress === "function") {
    onProgress(100, failures.length ? `Downloaded ${results.length} file(s); ${failures.length} failed.` : `Downloaded ${results.length} file(s).`);
  }
  return { succeeded: results.length, failures };
}
