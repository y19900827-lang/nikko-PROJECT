import { NextResponse } from "next/server";
import {
  DANCE_STYLES,
  PRODUCT_CATEGORIES,
  PRODUCT_COLORS,
  PRODUCT_SIZES,
  PRODUCT_STATUSES,
  isOption
} from "@/lib/constants";
import { attachSignedImageUrls, parseProductCreate } from "@/lib/products";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Product } from "@/lib/types";

export const runtime = "nodejs";

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

    const salePriceMin = Number(searchParams.get("salePriceMin"));
    const salePriceMax = Number(searchParams.get("salePriceMax"));
    if (Number.isFinite(salePriceMin) && salePriceMin >= 0) {
      query = query.gte("sale_price", salePriceMin);
    }
    if (Number.isFinite(salePriceMax) && salePriceMax >= 0) {
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

    const { data, error } = await query.limit(200);

    if (error) {
      throw new Error(error.message);
    }

    const products = await attachSignedImageUrls(supabase, (data ?? []) as Product[]);
    return NextResponse.json({ products });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "商品一覧を取得できませんでした。" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseProductCreate(body);

    if (!parsed.data) {
      return NextResponse.json({ error: parsed.errors.join("\n") }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: productCode, error: codeError } = await supabase.rpc("generate_product_code");

    if (codeError || typeof productCode !== "string") {
      throw new Error(codeError?.message ?? "商品IDを発行できませんでした。");
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        ...parsed.data,
        product_code: productCode,
        status: "在庫中"
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const product = await attachSignedImageUrls(supabase, data as Product);
    return NextResponse.json({ product }, { status: 201 });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "商品を保存できませんでした。" },
      { status: 500 }
    );
  }
}
