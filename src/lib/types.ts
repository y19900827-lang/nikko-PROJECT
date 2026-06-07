import type {
  DanceStyle,
  ProductCategory,
  ProductColor,
  ProductSize,
  ProductStatus
} from "@/lib/constants";

export type Product = {
  id: string;
  product_code: string;
  front_image_path: string;
  front_image_url?: string | null;
  tag_image_path: string;
  tag_image_url?: string | null;
  registered_at: string;
  purchase_date: string;
  purchase_price: number;
  sale_price: number;
  category: ProductCategory;
  dance_style: DanceStyle;
  color: ProductColor;
  size: ProductSize;
  notes: string;
  supplier: string | null;
  storage_location: string | null;
  sold_date: string | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
};

export type AnalyzeProductResult = {
  category: ProductCategory;
  dance_style: DanceStyle;
  color: ProductColor;
  size: ProductSize;
  confidence: number;
  raw_notes: string;
};

export type ProductCreateRequest = {
  frontImagePath: string;
  tagImagePath: string;
  purchaseDate: string;
  purchasePrice: number;
  salePrice: number;
  category: ProductCategory;
  danceStyle: DanceStyle;
  color: ProductColor;
  size: ProductSize;
  notes: string;
  supplier?: string;
  storageLocation?: string;
};

export type ProductUpdateRequest = {
  purchaseDate: string;
  purchasePrice: number;
  salePrice: number;
  category: ProductCategory;
  danceStyle: DanceStyle;
  color: ProductColor;
  size: ProductSize;
  notes: string;
  supplier?: string;
  storageLocation?: string;
  soldDate?: string | null;
  status: ProductStatus;
};
