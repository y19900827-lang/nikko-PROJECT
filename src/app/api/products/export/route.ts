import { NextResponse } from "next/server";
import {
  DANCE_STYLES,
  PRODUCT_CATEGORIES,
  PRODUCT_COLORS,
  PRODUCT_SIZES,
  PRODUCT_STATUSES,
  isOption
} from "@/lib/constants";
import { buildAirRegisterProductName } from "@/lib/products";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Product } from "@/lib/types";

export const runtime = "nodejs";

const CSV_HEADERS = [
  "商品ID",
  "Airレジ商品名",
  "登録日",
  "仕入日",
  "仕入価格",
  "販売価格",
  "商品カテゴリ",
  "ダンス種目",
  "色",
  "サイズ",
  "ステータス",
  "販売日",
  "仕入先",
  "保管場所",
  "備考",
  "正面写真パス",
  "タグ写真パス",
  "納品書写真パス"
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const supabase = getSupabaseAdmin();
    let query = supabase.from("products").select("*").order("registered_at", { ascending: false });

    const productCode = searchParams.get("productCode")?.trim();
    if (productCode) {
      query = query.ilike("product_code", `%${productCode}%`);
    }

    const category = searchParams.get("category");
    const danceStyle = searchParams.get("danceStyle");
    const color = searchParams.get("color");
    const size = searchParams.get("size");
    const status = searchParams.get("status");

    if (isOption(PRODUCT_CATEGORIES, category)) query = query.eq("category", category);
    if (isOption(DANCE_STYLES, danceStyle)) query = query.eq("dance_style", danceStyle);
    if (isOption(PRODUCT_COLORS, color)) query = query.eq("color", color);
    if (isOption(PRODUCT_SIZES, size)) query = query.eq("size", size);
    if (isOption(PRODUCT_STATUSES, status)) query = query.eq("status", status);

    const salePriceMinParam = searchParams.get("salePriceMin");
    const salePriceMaxParam = searchParams.get("salePriceMax");
    const salePriceMin = salePriceMinParam ? Number(salePriceMinParam) : null;
    const salePriceMax = salePriceMaxParam ? Number(salePriceMaxParam) : null;
    if (salePriceMin !== null && Number.isFinite(salePriceMin) && salePriceMin >= 0) {
      query = query.gte("sale_price", salePriceMin);
    }
    if (salePriceMax !== null && Number.isFinite(salePriceMax) && salePriceMax >= 0) {
      query = query.lte("sale_price", salePriceMax);
    }

    const registeredFrom = searchParams.get("registeredFrom");
    const registeredTo = searchParams.get("registeredTo");
    if (registeredFrom) {
      query = query.gte("registered_at", `${registeredFrom}T00:00:00.000Z`);
    }
    if (registeredTo) {
      query = query.lte("registered_at", `${registeredTo}T23:59:59.999Z`);
    }

    const { data, error } = await query.limit(5000);

    if (error) {
      throw new Error(error.message);
    }

    const csv = buildProductsCsv((data ?? []) as Product[]);
    const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="nikko-products-${date}.csv"`
      }
    });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "CSVを作成できませんでした。" },
      { status: 500 }
    );
  }
}

function buildProductsCsv(products: Product[]) {
  const rows = products.map((product) => [
    product.product_code,
    buildAirRegisterProductName(product),
    product.registered_at,
    product.purchase_date,
    product.purchase_price,
    product.sale_price,
    product.category,
    product.dance_style,
    product.color,
    product.size,
    product.status,
    product.sold_date ?? "",
    product.supplier ?? "",
    product.storage_location ?? "",
    product.notes,
    product.front_image_path,
    product.tag_image_path,
    product.invoice_image_path ?? ""
  ]);

  return `\uFEFF${[CSV_HEADERS, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\r\n")}\r\n`;
}

function escapeCsvValue(value: string | number) {
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }

  return text;
}
