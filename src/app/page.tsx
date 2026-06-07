"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Search } from "lucide-react";
import {
  DANCE_STYLES,
  PRODUCT_CATEGORIES,
  PRODUCT_COLORS,
  PRODUCT_SIZES,
  PRODUCT_STATUSES
} from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";

type Filters = {
  productCode: string;
  category: string;
  danceStyle: string;
  color: string;
  size: string;
  status: string;
  salePriceMin: string;
  salePriceMax: string;
  registeredFrom: string;
  registeredTo: string;
};

const emptyFilters: Filters = {
  productCode: "",
  category: "",
  danceStyle: "",
  color: "",
  size: "",
  status: "",
  salePriceMin: "",
  salePriceMax: "",
  registeredFrom: "",
  registeredTo: ""
};

export default function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    return params.toString();
  }, [filters]);

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/products${queryString ? `?${queryString}` : ""}`, {
        cache: "no-store"
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "商品一覧を取得できませんでした。");
      }

      setProducts(payload.products);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "商品一覧を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadProducts();
  }

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <h1>商品管理</h1>
          <p>社交ダンス衣装店</p>
        </div>
        <div className="toolbar">
          <button className="button" type="button" onClick={loadProducts} disabled={loading}>
            <RefreshCw size={18} />
            更新
          </button>
          <Link className="button primary" href="/products/new">
            <Plus size={18} />
            新規登録
          </Link>
        </div>
      </header>

      <form className="filter-panel panel" onSubmit={submitFilters}>
        <label className="field">
          <span>商品ID</span>
          <input value={filters.productCode} onChange={(event) => updateFilter("productCode", event.target.value)} placeholder="BD260001" />
        </label>
        <SelectField label="カテゴリ" value={filters.category} onChange={(value) => updateFilter("category", value)} options={PRODUCT_CATEGORIES} />
        <SelectField label="種目" value={filters.danceStyle} onChange={(value) => updateFilter("danceStyle", value)} options={DANCE_STYLES} />
        <SelectField label="色" value={filters.color} onChange={(value) => updateFilter("color", value)} options={PRODUCT_COLORS} />
        <SelectField label="サイズ" value={filters.size} onChange={(value) => updateFilter("size", value)} options={PRODUCT_SIZES} />
        <SelectField label="ステータス" value={filters.status} onChange={(value) => updateFilter("status", value)} options={PRODUCT_STATUSES} />
        <label className="field">
          <span>価格下限</span>
          <input type="number" min="0" value={filters.salePriceMin} onChange={(event) => updateFilter("salePriceMin", event.target.value)} />
        </label>
        <label className="field">
          <span>価格上限</span>
          <input type="number" min="0" value={filters.salePriceMax} onChange={(event) => updateFilter("salePriceMax", event.target.value)} />
        </label>
        <label className="field">
          <span>登録日From</span>
          <input type="date" value={filters.registeredFrom} onChange={(event) => updateFilter("registeredFrom", event.target.value)} />
        </label>
        <label className="field">
          <span>登録日To</span>
          <input type="date" value={filters.registeredTo} onChange={(event) => updateFilter("registeredTo", event.target.value)} />
        </label>
        <div className="filter-actions">
          <button className="button primary" type="submit" disabled={loading}>
            <Search size={18} />
            検索
          </button>
          <button className="button" type="button" onClick={() => setFilters(emptyFilters)}>
            クリア
          </button>
        </div>
      </form>

      {error ? <p className="message error">{error}</p> : null}
      {loading ? <p className="message">読み込み中</p> : null}
      {!loading && products.length === 0 ? <p className="empty-state">商品がありません</p> : null}

      <section className="product-grid">
        {products.map((product) => (
          <Link className="product-card" href={`/products/${product.id}`} key={product.id}>
            <div className="thumb">
              {product.front_image_url ? <img src={product.front_image_url} alt={`${product.product_code} 正面写真`} /> : "No image"}
            </div>
            <div className="product-card-body">
              <div className="product-code-row">
                <span className="product-code">{product.product_code}</span>
                <Status status={product.status} />
              </div>
              <div className="meta-list">
                <span className="chip">{product.category}</span>
                <span className="chip">{product.dance_style}</span>
                <span className="chip">{product.color}</span>
                <span className="chip">{product.size}</span>
              </div>
              <strong className="price">{formatCurrency(product.sale_price)}</strong>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">すべて</option>
        {options.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Status({ status }: { status: Product["status"] }) {
  const className = status === "販売済" ? "sold" : status === "値下げ" ? "discount" : status === "保留" ? "hold" : "";
  return <span className={`status ${className}`}>{status}</span>;
}
