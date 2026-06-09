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
  const { font, boldFont, supportsJapanese } = await loadFonts(pdf);
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
    const price = `\u00A5${new Intl.NumberFormat("ja-JP").format(product.sale_price)}`;

    drawLabel(page, {
      x,
      y,
      width: labelWidth,
      height: labelHeight,
      productCode: product.product_code,
      price,
      sizeLabel: supportsJapanese ? `サイズ: ${product.size}` : `Size: ${product.size}`,
      qrImage,
      font,
      boldFont
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

type DrawLabelInput = {
  x: number;
  y: number;
  width: number;
  height: number;
  productCode: string;
  price: string;
  sizeLabel: string;
  qrImage: PDFImage;
  font: PDFFont;
  boldFont: PDFFont;
};

function drawLabel(page: PDFPage, input: DrawLabelInput) {
  const padding = 12;
  const qrSize = Math.min(input.width * 0.32, 54);
  const textX = input.x + padding;
  const topY = input.y + input.height - padding - 20;

  page.drawRectangle({
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    borderColor: rgb(0.72, 0.74, 0.76),
    borderWidth: 0.7
  });

  page.drawText(input.productCode, {
    x: textX,
    y: topY,
    size: 16,
    font: input.boldFont,
    color: rgb(0.08, 0.09, 0.11)
  });

  page.drawText(input.price, {
    x: textX,
    y: topY - 30,
    size: 18,
    font: input.boldFont,
    color: rgb(0.05, 0.2, 0.18)
  });

  page.drawText(input.sizeLabel, {
    x: textX,
    y: topY - 56,
    size: 11,
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
