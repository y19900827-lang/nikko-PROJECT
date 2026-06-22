import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { generateQrPayload } from "@/lib/qr";
import type { Product } from "@/lib/types";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const COLUMNS = 3;
const ROWS = 4;
const LABELS_PER_PAGE = COLUMNS * ROWS;
const PAGE_MARGIN = 24;
const GAP = 8;

export async function generateSingleProductLabelPdf(product: Product) {
  return generateLabelSheetPdf([product], { repeatSingleToFillPage: true });
}

export async function generateLabelSheetPdf(
  products: Product[],
  options: { repeatSingleToFillPage?: boolean } = {}
) {
  if (products.length === 0) {
    throw new Error("値札PDFに出力する商品がありません。");
  }

  const pdf = await PDFDocument.create();
  const assets = await loadAssets(pdf);
  const labelWidth = (A4_WIDTH - PAGE_MARGIN * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const labelHeight = (A4_HEIGHT - PAGE_MARGIN * 2 - GAP * (ROWS - 1)) / ROWS;
  const labels =
    options.repeatSingleToFillPage && products.length === 1
      ? Array.from({ length: LABELS_PER_PAGE }, () => products[0])
      : products;

  let page: PDFPage | null = null;

  for (let index = 0; index < labels.length; index += 1) {
    const product = labels[index];
    const slot = index % LABELS_PER_PAGE;

    if (slot === 0) {
      page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    }

    if (!page) {
      throw new Error("値札PDFを作成できませんでした。");
    }

    const row = Math.floor(slot / COLUMNS);
    const column = slot % COLUMNS;
    const x = PAGE_MARGIN + column * (labelWidth + GAP);
    const y = A4_HEIGHT - PAGE_MARGIN - labelHeight - row * (labelHeight + GAP);
    const qrImage = await createQrImage(pdf, product);

    drawLabel(page, {
      x,
      y,
      width: labelWidth,
      height: labelHeight,
      productCode: product.product_code,
      itemLabel: formatItemLabel(product, assets.supportsJapanese),
      price: formatPrice(product, assets.supportsJapanese),
      sizeLabel: formatSizeLabel(product, assets.supportsJapanese),
      qrImage,
      ...assets
    });
  }

  return pdf.save();
}

async function createQrImage(pdf: PDFDocument, product: Product) {
  const qrDataUrl = await QRCode.toDataURL(generateQrPayload(product), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 160
  });
  return pdf.embedPng(qrDataUrl);
}

type LabelAssets = {
  font: PDFFont;
  boldFont: PDFFont;
  logoImage: PDFImage | null;
  supportsJapanese: boolean;
};

type DrawLabelInput = LabelAssets & {
  x: number;
  y: number;
  width: number;
  height: number;
  productCode: string;
  itemLabel: string;
  price: string;
  sizeLabel: string;
  qrImage: PDFImage;
};

function drawLabel(page: PDFPage, input: DrawLabelInput) {
  const padding = 10;
  const qrSize = Math.min(input.width * 0.34, 58);
  const textX = input.x + padding;
  const topY = input.y + input.height - padding - 20;
  const contentWidth = input.width - padding * 2;
  const accent = rgb(0.95, 0.56, 0.05);

  page.drawRectangle({
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    borderColor: rgb(0.72, 0.74, 0.76),
    borderWidth: 0.7
  });

  const logoWidth = drawLogo(page, input);
  const productCodeMaxWidth = Math.max(70, contentWidth - logoWidth - 8);

  drawFittedText(page, input.productCode, {
    x: textX,
    y: topY,
    maxWidth: productCodeMaxWidth,
    size: 16,
    minSize: 12,
    font: input.boldFont,
    color: rgb(0.08, 0.09, 0.11)
  });

  drawFittedText(page, input.itemLabel, {
    x: textX,
    y: topY - 25,
    maxWidth: contentWidth,
    size: 10,
    minSize: 8,
    font: input.font,
    color: rgb(0.2, 0.22, 0.25)
  });

  drawFittedText(page, input.price, {
    x: textX,
    y: topY - 55,
    maxWidth: contentWidth,
    size: 17,
    minSize: 11,
    font: input.boldFont,
    color: rgb(0.06, 0.18, 0.15)
  });

  page.drawLine({
    start: { x: textX, y: topY - 66 },
    end: { x: textX + Math.min(contentWidth, 92), y: topY - 66 },
    thickness: 1.1,
    color: accent
  });

  drawFittedText(page, input.sizeLabel, {
    x: textX,
    y: topY - 86,
    maxWidth: contentWidth - qrSize - 8,
    size: 10,
    minSize: 8,
    font: input.font,
    color: rgb(0.19, 0.22, 0.26)
  });

  page.drawImage(input.qrImage, {
    x: input.x + input.width - padding - qrSize,
    y: input.y + padding,
    width: qrSize,
    height: qrSize
  });
}

function drawLogo(page: PDFPage, input: DrawLabelInput) {
  if (!input.logoImage) {
    return 0;
  }

  const padding = 10;
  const maxWidth = 42;
  const maxHeight = 48;
  const scale = Math.min(maxWidth / input.logoImage.width, maxHeight / input.logoImage.height);
  const width = input.logoImage.width * scale;
  const height = input.logoImage.height * scale;
  const x = input.x + input.width - padding - width;
  const y = input.y + input.height - padding - height;

  page.drawImage(input.logoImage, { x, y, width, height });
  return width;
}

function drawFittedText(
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    maxWidth: number;
    size: number;
    minSize: number;
    font: PDFFont;
    color: ReturnType<typeof rgb>;
  }
) {
  let size = options.size;

  while (size > options.minSize && options.font.widthOfTextAtSize(text, size) > options.maxWidth) {
    size -= 0.5;
  }

  page.drawText(text, {
    x: options.x,
    y: options.y,
    size,
    font: options.font,
    color: options.color
  });
}

async function loadAssets(pdf: PDFDocument): Promise<LabelAssets> {
  const { font, boldFont, supportsJapanese } = await loadFonts(pdf);
  const logoImage = await loadLogo(pdf);
  return { font, boldFont, supportsJapanese, logoImage };
}

async function loadLogo(pdf: PDFDocument) {
  const logoPath = path.join(process.cwd(), "public", "nikko-logo.jpg");

  if (!existsSync(logoPath)) {
    return null;
  }

  try {
    const logoBytes = await readFile(logoPath);
    return pdf.embedJpg(logoBytes);
  } catch {
    return null;
  }
}

async function loadFonts(pdf: PDFDocument) {
  const fallbackFont = await pdf.embedFont(StandardFonts.Helvetica);
  const fallbackBoldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontPath = resolveJapaneseFontPath();

  if (!fontPath) {
    return { font: fallbackFont, boldFont: fallbackBoldFont, supportsJapanese: false };
  }

  try {
    pdf.registerFontkit(fontkit);
    const fontBytes = await readFile(fontPath);
    const japaneseFont = await pdf.embedFont(fontBytes, { subset: true });
    return { font: japaneseFont, boldFont: japaneseFont, supportsJapanese: true };
  } catch {
    return { font: fallbackFont, boldFont: fallbackBoldFont, supportsJapanese: false };
  }
}

function resolveJapaneseFontPath() {
  const configuredPath = process.env.LABEL_FONT_PATH;
  if (configuredPath && existsSync(configuredPath)) {
    return configuredPath;
  }

  const bundledPath = path.join(process.cwd(), "public", "fonts", "label-font.otf");
  return existsSync(bundledPath) ? bundledPath : null;
}

function formatPrice(product: Product, supportsJapanese: boolean) {
  const amount = Math.max(0, Number(product.sale_price) || 0);
  const formatted = new Intl.NumberFormat("ja-JP").format(amount);
  return supportsJapanese ? `${formatted}円（税込）` : `${formatted} yen tax included`;
}

function formatItemLabel(product: Product, supportsJapanese: boolean) {
  if (supportsJapanese) {
    return `品目: ${product.dance_style} ${product.category}`;
  }

  return `Item: ${toAsciiDanceStyle(product.dance_style)} ${toAsciiCategory(product.category)}`;
}

function formatSizeLabel(product: Product, supportsJapanese: boolean) {
  return supportsJapanese ? `サイズ: ${product.size}` : `Size: ${toAsciiSize(product.size)}`;
}

function toAsciiDanceStyle(danceStyle: Product["dance_style"]) {
  const map: Record<Product["dance_style"], string> = {
    ラテン: "Latin",
    スタンダード: "Standard",
    練習着: "Practice",
    一般服: "Casual"
  };

  return map[danceStyle] ?? "Unknown";
}

function toAsciiCategory(category: Product["category"]) {
  const map: Record<Product["category"], string> = {
    ドレス: "Dress",
    スカート: "Skirt",
    トップス: "Tops",
    メンズシャツ: "Mens Shirt",
    シューズ: "Shoes",
    アクセサリー: "Accessory",
    小物: "Goods",
    一般服: "Casual Wear"
  };

  return map[category] ?? "Unknown";
}

function toAsciiSize(size: Product["size"]) {
  const map: Record<Product["size"], string> = {
    F: "Free",
    S: "S",
    M: "M",
    L: "L",
    LL: "LL",
    "3L以上": "3L+",
    不明: "Unknown"
  };

  return map[size] ?? "Unknown";
}
