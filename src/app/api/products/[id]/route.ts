import { NextResponse } from "next/server";
import { attachSignedImageUrls, parseProductUpdate } from "@/lib/products";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Product } from "@/lib/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("products").select("*").eq("id", id).single();

    if (error) {
      throw new Error(error.message);
    }

    const product = await attachSignedImageUrls(supabase, data as Product);
    return NextResponse.json({ product });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "商品を取得できませんでした。" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseProductUpdate(body);

    if (!parsed.data) {
      return NextResponse.json({ error: parsed.errors.join("\n") }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("products")
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const product = await attachSignedImageUrls(supabase, data as Product);
    return NextResponse.json({ product });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "商品を保存できませんでした。" },
      { status: 500 }
    );
  }
}
