const MAX_IMAGE_EDGE = 1600;
const JPEG_QUALITY = 0.82;
const SKIP_COMPRESS_SIZE = 1.8 * 1024 * 1024;

export async function prepareImageForUpload(file: File) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  if (file.type === "image/jpeg" && file.size <= SKIP_COMPRESS_SIZE) {
    return file;
  }

  try {
    const image = await loadImage(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, width, height);
    const blob = await canvasToBlob(canvas);

    if (!blob || blob.size >= file.size) {
      return file;
    }

    return new File([blob], toJpegName(file.name), {
      type: "image/jpeg",
      lastModified: file.lastModified
    });
  } catch {
    return file;
  }
}

async function loadImage(file: File) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file);
  }

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読み込めませんでした。"));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
  });
}

function toJpegName(name: string) {
  return name.replace(/\.[^.]+$/, "") + ".jpg";
}
