import imageCompression from "browser-image-compression";

// 사진을 브라우저에서 1MB 이하로 줄인다 (architecture 2장 사진, spec 6장).
// HEIC 등 다른 형식은 JPEG로 바꾼다. Storage 버킷은 1MB(1,048,576바이트)까지, JPEG·PNG·WebP만 받는다.

export const PHOTO_MAX_BYTES = 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const TARGET_MB = 0.9;
const MAX_EDGE = 1600; // 390px 화면 × 3배 해상도(1170px)보다 넉넉하게

/** 브라우저가 이 사진 형식을 열지 못함 (예: Android Chrome의 HEIC) → "JPEG로 골라 주세요" */
export class PhotoDecodeError extends Error {
  constructor() {
    super("PHOTO_DECODE_FAILED");
  }
}

export async function compressPhoto(file: File): Promise<File> {
  let compressed: File;
  try {
    compressed = await imageCompression(file, {
      maxSizeMB: TARGET_MB,
      maxWidthOrHeight: MAX_EDGE,
      fileType: "image/jpeg",
      initialQuality: 0.85,
      // 웹 워커는 라이브러리를 외부 CDN(jsdelivr)에서 불러오므로 쓰지 않는다
      useWebWorker: false,
    });
    // 줄인 결과가 원본보다 크면 라이브러리가 원본을 그대로 돌려준다. 버킷이 받지 않는 형식이면 JPEG로 다시 그린다
    if (!PHOTO_TYPES.includes(compressed.type)) {
      const [, canvas] = await imageCompression.drawFileInCanvas(file);
      compressed = await imageCompression.canvasToFile(canvas, "image/jpeg", file.name, file.lastModified, 0.85);
    }
  } catch {
    throw new PhotoDecodeError();
  }
  if (compressed.size > PHOTO_MAX_BYTES || !PHOTO_TYPES.includes(compressed.type)) throw new Error("PHOTO_TOO_LARGE");
  return compressed;
}
