import { NextResponse } from "next/server";
import { generateLabelSheetPdf } from "@/lib/labels";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Product } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ids?: unknown };
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "値札PDFに出力する商品を選択してください。" }, { status: 400 });
    }

    if (ids.length > 200) {
      return NextResponse.json({ error: "一度に出力できる商品は200件までです。" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("products").select("*").in("id", ids);

    if (error) {
      throw new Error(error.message);
    }

    const productsById = new Map((data ?? []).map((product) => [product.id, product as Product]));
    const products = ids.map((id) => productsById.get(id)).filter((product): product is Product => Boolean(product));

    if (products.length === 0) {
      return NextResponse.json({ error: "選択した商品が見つかりませんでした。" }, { status: 404 });
    }

    const bytes = await generateLabelSheetPdf(products);

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="product-labels.pdf"`
      }
    });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "値札PDFを作成できませんでした。" },
      { status: 500 }
    );
  }
}
