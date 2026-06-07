import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  DANCE_STYLES,
  PRODUCT_CATEGORIES,
  PRODUCT_COLORS,
  PRODUCT_SIZES,
  isOption
} from "@/lib/constants";
import type { AnalyzeProductResult } from "@/lib/types";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEYが未設定です。" }, { status: 500 });
    }

    const formData = await request.formData();
    const frontImage = formData.get("frontImage");
    const tagImage = formData.get("tagImage");

    if (!isValidImage(frontImage) || !isValidImage(tagImage)) {
      return NextResponse.json({ error: "正面写真とタグ写真を選んでください。" }, { status: 400 });
    }

    const [frontDataUrl, tagDataUrl] = await Promise.all([
      toDataUrl(frontImage),
      toDataUrl(tagImage)
    ]);
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_VISION_MODEL || "gpt-5.4-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "社交ダンス衣装店の商品登録用に、正面写真とタグ写真から候補値だけを判定してください。",
                "AI結果は確定ではなく、人間が後で修正します。",
                "商品カテゴリ、ダンス種目、色、サイズは必ず指定された選択肢から選んでください。",
                "サイズはタグ写真の文字を優先し、読めない場合は不明にしてください。"
              ].join("\n")
            },
            { type: "input_image", image_url: frontDataUrl, detail: "high" },
            { type: "input_image", image_url: tagDataUrl, detail: "high" }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "product_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              category: { type: "string", enum: PRODUCT_CATEGORIES },
              dance_style: { type: "string", enum: DANCE_STYLES },
              color: { type: "string", enum: PRODUCT_COLORS },
              size: { type: "string", enum: PRODUCT_SIZES },
              confidence: { type: "number" },
              raw_notes: { type: "string" }
            },
            required: ["category", "dance_style", "color", "size", "confidence", "raw_notes"]
          }
        }
      }
    });

    const parsed = JSON.parse(response.output_text) as Partial<AnalyzeProductResult>;

    return NextResponse.json({
      category: isOption(PRODUCT_CATEGORIES, parsed.category) ? parsed.category : "一般服",
      dance_style: isOption(DANCE_STYLES, parsed.dance_style) ? parsed.dance_style : "一般服",
      color: isOption(PRODUCT_COLORS, parsed.color) ? parsed.color : "不明",
      size: isOption(PRODUCT_SIZES, parsed.size) ? parsed.size : "不明",
      confidence: typeof parsed.confidence === "number" ? clamp(parsed.confidence, 0, 1) : 0,
      raw_notes: typeof parsed.raw_notes === "string" ? parsed.raw_notes : ""
    } satisfies AnalyzeProductResult);
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "AI解析に失敗しました。" },
      { status: 500 }
    );
  }
}

async function toDataUrl(file: File) {
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  return `data:${file.type};base64,${base64}`;
}

function isValidImage(value: FormDataEntryValue | null): value is File {
  return value instanceof File && ALLOWED_TYPES.has(value.type) && value.size <= MAX_FILE_SIZE;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
