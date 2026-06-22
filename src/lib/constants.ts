export const PRODUCT_CATEGORIES = [
  "ドレス",
  "スカート",
  "トップス",
  "メンズシャツ",
  "シューズ",
  "アクセサリー",
  "小物",
  "一般服"
] as const;

export const DANCE_STYLES = ["ラテン", "スタンダード", "練習着", "一般服"] as const;

export const PRODUCT_SIZES = ["F", "S", "M", "L", "LL", "3L以上", "不明"] as const;

export const PRODUCT_COLORS = [
  "赤",
  "青",
  "黒",
  "白",
  "ピンク",
  "紫",
  "緑",
  "黄",
  "ゴールド",
  "シルバー",
  "ベージュ",
  "茶",
  "グレー",
  "ネイビー",
  "多色",
  "不明"
] as const;

export const PRODUCT_STATUSES = ["在庫中", "販売済", "値下げ", "保留"] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type DanceStyle = (typeof DANCE_STYLES)[number];
export type ProductSize = (typeof PRODUCT_SIZES)[number];
export type ProductColor = (typeof PRODUCT_COLORS)[number];
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export function isOption<T extends readonly string[]>(options: T, value: unknown): value is T[number] {
  return typeof value === "string" && options.includes(value);
}
