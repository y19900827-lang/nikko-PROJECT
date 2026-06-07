import { NextResponse } from "next/server";
import { PRODUCT_IMAGES_BUCKET, getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"]
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const frontImage = formData.get("frontImage");
    const tagImage = formData.get("tagImage");

    if (!isFile(frontImage) || !isFile(tagImage)) {
      return NextResponse.json({ error: "正面写真とタグ写真を選んでください。" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const [frontImagePath, tagImagePath] = await Promise.all([
      uploadImage(supabase, frontImage, "front"),
      uploadImage(supabase, tagImage, "tag")
    ]);

    return NextResponse.json({ frontImagePath, tagImagePath });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "画像アップロードに失敗しました。" },
      { status: 500 }
    );
  }
}

async function uploadImage(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  file: File,
  kind: "front" | "tag"
) {
  const extension = ALLOWED_TYPES.get(file.type);

  if (!extension) {
    throw new Error("画像はPNG、JPEG、WEBP、GIFを選んでください。");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("画像は1枚10MB以内にしてください。");
  }

  const year = new Date().getFullYear();
  const path = `${year}/${kind}/${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, buffer, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false
  });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

function isFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File;
}
