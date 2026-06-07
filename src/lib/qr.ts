import type { Product } from "@/lib/types";

export function generateQrPayload(product: Pick<Product, "product_code">) {
  return product.product_code;
}
