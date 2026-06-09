import { NextResponse } from "next/server";
import { generateSingleProductLabelPdf } from "@/lib/labels";
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

    const product = data as Product;
    const bytes = await generateSingleProductLabelPdf(product);

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${product.product_code}-label.pdf"`
      }
    });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "値札PDFを作成できませんでした。" },
      { status: 500 }
    );
  }
}
