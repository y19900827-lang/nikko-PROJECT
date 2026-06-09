import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DANCE_STYLES,
  PRODUCT_CATEGORIES,
  PRODUCT_COLORS,
  PRODUCT_SIZES,
  PRODUCT_STATUSES,
  isOption
} from "@/lib/constants";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/supabase-admin";
import type { Product } from "@/lib/types";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function buildAirRegisterProductName(product: Pick<Product, "dance_style" | "category" | "color" | "size" | "product_code">) {
  return `${product.dance_style}${product.category} ${product.color} ${product.size} ${product.product_code}`;
}

export async function attachSignedImageUrls<T extends Product | Product[]>(
  supabase: SupabaseClient,
  value: T
): Promise<T> {
  if (Array.isArray(value)) {
    const products = await Promise.all(value.map((product) => attachSignedImageUrls(supabase, product)));
    return products as T;
  }

  const product = value as Product;
  const [front, tag, invoice] = await Promise.all([
    supabase.storage.from(PRODUCT_IMAGES_BUCKET).createSignedUrl(product.front_image_path, 60 * 60),
    supabase.storage.from(PRODUCT_IMAGES_BUCKET).createSignedUrl(product.tag_image_path, 60 * 60),
    product.invoice_image_path
      ? supabase.storage.from(PRODUCT_IMAGES_BUCKET).createSignedUrl(product.invoice_image_path, 60 * 60)
      : Promise.resolve({ data: null })
  ]);

  return {
    ...product,
    front_image_url: front.data?.signedUrl ?? null,
    tag_image_url: tag.data?.signedUrl ?? null,
    invoice_image_url: invoice.data?.signedUrl ?? null
  } as T;
}

export function parseProductCreate(body: Record<string, unknown>) {
  const errors: string[] = [];
  const frontImagePath = readString(body.frontImagePath);
  const tagImagePath = readString(body.tagImagePath);
  const invoiceImagePath = readOptionalString(body.invoiceImagePath);
  const purchaseDate = readDate(body.purchaseDate);
  const purchasePrice = readInteger(body.purchasePrice);
  const salePrice = readInteger(body.salePrice);
  const category = readEnum(PRODUCT_CATEGORIES, body.category);
  const danceStyle = readEnum(DANCE_STYLES, body.danceStyle);
  const color = readEnum(PRODUCT_COLORS, body.color);
  const size = readEnum(PRODUCT_SIZES, body.size);

  if (!frontImagePath) errors.push("正面写真が必要です。");
  if (!tagImagePath) errors.push("タグ写真が必要です。");
  if (!purchaseDate) errors.push("仕入日が必要です。");
  if (purchasePrice === null) errors.push("仕入価格は0以上の整数で入力してください。");
  if (salePrice === null) errors.push("販売価格は0以上の整数で入力してください。");
  if (!category) errors.push("商品カテゴリを選んでください。");
  if (!danceStyle) errors.push("ダンス種目を選んでください。");
  if (!color) errors.push("色を選んでください。");
  if (!size) errors.push("サイズを選んでください。");

  if (errors.length > 0 || !purchaseDate || purchasePrice === null || salePrice === null || !category || !danceStyle || !color || !size) {
    return { errors, data: null };
  }

  return {
    errors,
    data: {
      front_image_path: frontImagePath,
      tag_image_path: tagImagePath,
      invoice_image_path: invoiceImagePath,
      purchase_date: purchaseDate,
      purchase_price: purchasePrice,
      sale_price: salePrice,
      category,
      dance_style: danceStyle,
      color,
      size,
      notes: readString(body.notes) ?? "",
      supplier: readOptionalString(body.supplier),
      storage_location: readOptionalString(body.storageLocation)
    }
  };
}

export function parseProductUpdate(body: Record<string, unknown>) {
  const errors: string[] = [];
  const purchaseDate = readDate(body.purchaseDate);
  const purchasePrice = readInteger(body.purchasePrice);
  const salePrice = readInteger(body.salePrice);
  const category = readEnum(PRODUCT_CATEGORIES, body.category);
  const danceStyle = readEnum(DANCE_STYLES, body.danceStyle);
  const color = readEnum(PRODUCT_COLORS, body.color);
  const size = readEnum(PRODUCT_SIZES, body.size);
  const status = readEnum(PRODUCT_STATUSES, body.status);
  const soldDate = body.soldDate === null || body.soldDate === "" ? null : readDate(body.soldDate);

  if (!purchaseDate) errors.push("仕入日が必要です。");
  if (purchasePrice === null) errors.push("仕入価格は0以上の整数で入力してください。");
  if (salePrice === null) errors.push("販売価格は0以上の整数で入力してください。");
  if (!category) errors.push("商品カテゴリを選んでください。");
  if (!danceStyle) errors.push("ダンス種目を選んでください。");
  if (!color) errors.push("色を選んでください。");
  if (!size) errors.push("サイズを選んでください。");
  if (!status) errors.push("ステータスを選んでください。");
  if (body.soldDate && !soldDate) errors.push("販売日の形式が正しくありません。");

  if (errors.length > 0 || !purchaseDate || purchasePrice === null || salePrice === null || !category || !danceStyle || !color || !size || !status) {
    return { errors, data: null };
  }

  return {
    errors,
    data: {
      purchase_date: purchaseDate,
      purchase_price: purchasePrice,
      sale_price: salePrice,
      category,
      dance_style: danceStyle,
      color,
      size,
      notes: readString(body.notes) ?? "",
      supplier: readOptionalString(body.supplier),
      storage_location: readOptionalString(body.storageLocation),
      sold_date: soldDate,
      status,
      updated_at: new Date().toISOString()
    }
  };
}

function readString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readInteger(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 0) {
    return null;
  }

  return numberValue;
}

function readDate(value: unknown) {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    return null;
  }

  return value;
}

function readEnum<T extends readonly string[]>(options: T, value: unknown) {
  return isOption(options, value) ? value : null;
}
