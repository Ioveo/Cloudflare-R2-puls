const THUMBNAIL_SIZE = 144;

/**
 * @param {File} file
 */
export async function generateThumbnail(file) {
  const canvas = document.createElement("canvas");
  canvas.width = THUMBNAIL_SIZE;
  canvas.height = THUMBNAIL_SIZE;
  const ctx = canvas.getContext("2d");

  if (file.size > 60 * 1024 * 1024) return null; // Guard against heavy memory usage

  if (file.type.startsWith("image/")) {
    const image = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
    if (!image) return null;
    ctx.drawImage(image, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  } else if (file.type === "video/mp4" || file.type.startsWith("video/")) {
    const video = await new Promise((resolve) => {
      const v = document.createElement("video");
      v.muted = true;
      v.src = URL.createObjectURL(file);
      const timer = setTimeout(() => resolve(null), 2000);
      v.onloadeddata = () => {
        clearTimeout(timer);
        ctx.drawImage(v, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
        resolve(v);
      };
      v.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
    });
    if (!video) return null;
  }

  const thumbnailBlob = await new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob))
  );

  return thumbnailBlob;
}

/**
 * @param {Blob} blob
 */
export async function blobDigest(blob) {
  const digest = await crypto.subtle.digest("SHA-1", await blob.arrayBuffer());
  const digestArray = Array.from(new Uint8Array(digest));
  const digestHex = digestArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return digestHex;
}

const MEBIBYTE = 1024 * 1024;
const MIN_PART_SIZE = 5 * MEBIBYTE;
const MAX_MULTIPART_PARTS = 10_000;
const MAX_RETRIES = 4;

// Threshold for multipart uploads: files > 10MB immediately gain multi-threaded parallel chunk uploads
export const MULTIPART_THRESHOLD = 10 * MEBIBYTE;

function getPartSize(fileSize) {
  if (fileSize > 5 * 1024 * MEBIBYTE) return 64 * MEBIBYTE; // 64MB chunk for >5GB
  if (fileSize > 1024 * MEBIBYTE) return 32 * MEBIBYTE;     // 32MB chunk for >1GB
  if (fileSize > 256 * MEBIBYTE) return 16 * MEBIBYTE;      // 16MB chunk for >256MB
  if (fileSize > 50 * MEBIBYTE) return 10 * MEBIBYTE;       // 10MB chunk for >50MB
  const sizeForPartLimit = Math.ceil(fileSize / MAX_MULTIPART_PARTS);
  return Math.max(8 * MEBIBYTE, MIN_PART_SIZE, sizeForPartLimit);
}

function getConcurrentUploads() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection?.saveData || connection?.effectiveType === "2g") return 2;
  if (connection?.effectiveType === "3g") return 4;
  return 8; // High speed 8 parallel upload threads for maximum throughput!
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function shouldRetry(error) {
  const status = error?.response?.status;
  return !status || status === 408 || status === 429 || status >= 500;
}

async function retryUpload(uploadPart) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await uploadPart();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES || !shouldRetry(error)) throw error;
      await sleep(300 * 2 ** attempt + Math.random() * 200);
    }
  }
  throw lastError;
}

/**
 * @param {string} key
 * @param {File} file
 * @param {Record<string, any>} options
 */
export async function multipartUpload(key, file, options) {
  const headers = { ...(options?.headers || {}), "content-type": file.type || "application/octet-stream" };

  const uploadId = await axios
    .post(`/api/write/items/${key}?uploads`, "", { headers })
    .then((res) => res.data.uploadId);
  const partSize = getPartSize(file.size);
  const totalChunks = Math.ceil(file.size / partSize);
  const progressByPart = new Map();
  const uploadedParts = [];
  let nextPartIndex = 0;

  const reportProgress = () => {
    if (typeof options?.onUploadProgress !== "function") return;
    const loaded = [...progressByPart.values()].reduce((total, value) => total + value, 0);
    options.onUploadProgress({ loaded: Math.min(loaded, file.size), total: file.size });
  };

  const uploadPart = async (partIndex) => {
    const partNumber = partIndex + 1;
    const start = partIndex * partSize;
    const chunk = file.slice(start, Math.min(start + partSize, file.size));
    const searchParams = new URLSearchParams({ partNumber, uploadId });
    const response = await retryUpload(() =>
      axios.put(`/api/write/items/${key}?${searchParams}`, chunk, {
        headers: options?.headers,
        onUploadProgress(event) {
          progressByPart.set(partNumber, event.loaded);
          reportProgress();
        },
      })
    );
    progressByPart.set(partNumber, chunk.size);
    reportProgress();
    uploadedParts.push({ partNumber, etag: response.headers.etag });
  };

  const worker = async () => {
    while (nextPartIndex < totalChunks) {
      const partIndex = nextPartIndex++;
      await uploadPart(partIndex);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(getConcurrentUploads(), totalChunks) }, worker)
  );
  uploadedParts.sort((left, right) => left.partNumber - right.partNumber);
  const completeParams = new URLSearchParams({ uploadId });
  await axios.post(
    `/api/write/items/${key}?${completeParams}`,
    { parts: uploadedParts },
    { headers: options?.headers }
  );
}
