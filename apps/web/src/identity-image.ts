export const identityUploadLimitBytes = 8 * 1024 * 1024;
export const identityImageSourceLimitBytes = 30 * 1024 * 1024;
export const identityImageTargetBytes = 3 * 1024 * 1024;
export const identityImageMaxEdge = 2600;
export const identityImageMaxPixels = 40_000_000;

export type IdentityPreparationErrorCode =
  | "identity_document_empty"
  | "identity_document_too_large"
  | "identity_image_source_too_large"
  | "identity_image_dimensions_too_large"
  | "identity_image_decode_failed"
  | "unsupported_identity_document";

export class IdentityPreparationError extends Error {
  constructor(public code: IdentityPreparationErrorCode) {
    super(code);
  }
}

export type PreparedIdentityUpload = {
  file: File;
  originalName: string;
  originalSize: number;
  optimized: boolean;
  width?: number;
  height?: number;
};

export function fitIdentityImage(width: number, height: number, maxEdge = identityImageMaxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function sniffIdentityFile(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return "image/png";
  return null;
}

function jpegName(name: string) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9._-]+/gi, "-").slice(0, 80) || "identity-document";
  return `${base}.jpg`;
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new IdentityPreparationError("identity_image_decode_failed"))), "image/jpeg", quality);
  });
}

export async function prepareIdentityUpload(file: File): Promise<PreparedIdentityUpload> {
  if (!file.size) throw new IdentityPreparationError("identity_document_empty");
  const detectedType = await sniffIdentityFile(file);
  if (!detectedType) throw new IdentityPreparationError("unsupported_identity_document");
  if (detectedType === "application/pdf") {
    if (file.size > identityUploadLimitBytes) throw new IdentityPreparationError("identity_document_too_large");
    return { file, originalName: file.name, originalSize: file.size, optimized: false };
  }
  if (file.size > identityImageSourceLimitBytes) throw new IdentityPreparationError("identity_image_source_too_large");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new IdentityPreparationError("identity_image_decode_failed");
  }
  try {
    if (bitmap.width * bitmap.height > identityImageMaxPixels)
      throw new IdentityPreparationError("identity_image_dimensions_too_large");
    const dimensions = fitIdentityImage(bitmap.width, bitmap.height);
    if (file.size <= identityImageTargetBytes && dimensions.width === bitmap.width && dimensions.height === bitmap.height)
      return { file, originalName: file.name, originalSize: file.size, optimized: false, width: bitmap.width, height: bitmap.height };

    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new IdentityPreparationError("identity_image_decode_failed");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let blob: Blob | null = null;
    for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58]) {
      blob = await canvasBlob(canvas, quality);
      if (blob.size <= identityImageTargetBytes) break;
    }
    if (!blob || blob.size > identityUploadLimitBytes) throw new IdentityPreparationError("identity_document_too_large");
    return {
      file: new File([blob], jpegName(file.name), { type: "image/jpeg", lastModified: Date.now() }),
      originalName: file.name,
      originalSize: file.size,
      optimized: true,
      width: dimensions.width,
      height: dimensions.height,
    };
  } finally {
    bitmap.close();
  }
}

function csrfToken() {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("stream_csrf="))
    ?.slice("stream_csrf=".length);
}

export class IdentityUploadRequestError extends Error {
  constructor(public code: string, public status = 0) {
    super(code);
  }
}

export function uploadIdentityDocument(documentType: string, file: File, onProgress: (percent: number | null) => void) {
  return new Promise<unknown>((resolve, reject) => {
    const body = new FormData();
    body.append("document", file);
    const request = new XMLHttpRequest();
    request.open("POST", `/api/creator/onboarding/identity-document?documentType=${encodeURIComponent(documentType)}`);
    request.withCredentials = true;
    request.timeout = 120_000;
    const csrf = csrfToken();
    if (csrf) request.setRequestHeader("x-csrf-token", csrf);
    request.upload.onprogress = (event) => onProgress(event.lengthComputable ? Math.round((event.loaded / event.total) * 100) : null);
    request.onerror = () => reject(new IdentityUploadRequestError("upload_connection_failed"));
    request.ontimeout = () => reject(new IdentityUploadRequestError("upload_timed_out"));
    request.onload = () => {
      let payload: { error?: string } | null = null;
      try { payload = request.responseText ? JSON.parse(request.responseText) : null; } catch {}
      if (request.status >= 200 && request.status < 300) resolve(payload);
      else reject(new IdentityUploadRequestError(payload?.error ?? `http_${request.status}`, request.status));
    };
    onProgress(null);
    request.send(body);
  });
}
