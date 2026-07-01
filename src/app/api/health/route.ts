import { NextResponse } from "next/server";
import { getSupabaseAdmin, PRODUCT_IMAGES_BUCKET } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^=+/, "") ?? "",
      bucket: PRODUCT_IMAGES_BUCKET,
      productCount: count ?? 0
    });
  } catch (caught) {
    return NextResponse.json(
      {
        ok: false,
        error: caught instanceof Error ? caught.message : "Health check failed"
      },
      { status: 500 }
    );
  }
}
