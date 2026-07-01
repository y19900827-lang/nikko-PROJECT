"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, FileDown, Folder, Plus, RefreshCw, Search } from "lucide-react";
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

type SortKey =
  | "registered_desc"
  | "registered_asc"
  | "product_code_asc"
  | "product_code_desc"
  | "category_asc"
  | "sale_price_desc"
  | "sale_price_asc";

type ViewMode = "grid" | "category";

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

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "registered_desc", label: "登録日 新しい順" },
  { value: "registered_asc", label: "登録日 古い順" },
  { value: "product_code_asc", label: "商品ID 昇順" },
  { value: "product_code_desc", label: "商品ID 降順" },
  { value: "category_asc", label: "カテゴリ順" },
  { value: "sale_price_desc", label: "販売価格 高い順" },
  { value: "sale_price_asc", label: "販売価格 安い順" }
];

export default function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sortKey, setSortKey] = useState<SortKey>("registered_desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingLabels, setExportingLabels] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
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

  const sortedProducts = useMemo(() => {
    const copy = [...products];

    copy.sort((a, b) => {
      switch (sortKey) {
        case "registered_asc":
          return Date.parse(a.registered_at) - Date.parse(b.registered_at);
        case "product_code_asc":
          return a.product_code.localeCompare(b.product_code);
        case "product_code_desc":
          return b.product_code.localeCompare(a.product_code);
        case "category_asc":
          return a.category.localeCompare(b.category, "ja") || a.product_code.localeCompare(b.product_code);
        case "sale_price_desc":
          return b.sale_price - a.sale_price;
        case "sale_price_asc":
          return a.sale_price - b.sale_price;
        case "registered_desc":
        default:
          return Date.parse(b.registered_at) - Date.parse(a.registered_at);
      }
    });

    return copy;
  }, [products, sortKey]);

  const groupedProducts = useMemo(
    () =>
      PRODUCT_CATEGORIES.map((category) => ({
        category,
        products: sortedProducts.filter((product) => product.category === category)
      })).filter((group) => group.products.length > 0),
    [sortedProducts]
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const displayedIds = useMemo(() => sortedProducts.map((product) => product.id), [sortedProducts]);
  const allDisplayedSelected =
    displayedIds.length > 0 && displayedIds.every((id) => selectedSet.has(id));

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => products.some((product) => product.id === id)));
  }, [products]);

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

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadProducts();
  }

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleSelected(productId: string) {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  }

  function toggleAllDisplayed() {
    setSelectedIds((current) => {
      const currentSet = new Set(current);

      if (allDisplayedSelected) {
        return current.filter((id) => !displayedIds.includes(id));
      }

      displayedIds.forEach((id) => currentSet.add(id));
      return Array.from(currentSet);
    });
  }

  async function exportCsv() {
    setExportingCsv(true);
    setError("");

    try {
      const response = await fetch(`/api/products/export${queryString ? `?${queryString}` : ""}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "CSVを作成できませんでした。");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
      link.href = url;
      link.download = `nikko-products-${date}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "CSVを作成できませんでした。");
    } finally {
      setExportingCsv(false);
    }
  }

  async function exportSelectedLabels() {
    if (selectedIds.length === 0) {
      setError("値札PDFに出力する商品を選択してください。");
      return;
    }

    setExportingLabels(true);
    setError("");

    try {
      const response = await fetch("/api/labels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ids: selectedIds })
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "値札PDFを作成できませんでした。");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
      link.href = url;
      link.download = `product-labels-${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "値札PDFを作成できませんでした。");
    } finally {
      setExportingLabels(false);
    }
  }

  useEffect(() => {
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productCards = (items: Product[]) =>
    items.map((product) => (
      <ProductCard
        key={product.id}
        product={product}
        selected={selectedSet.has(product.id)}
        onToggle={() => toggleSelected(product.id)}
      />
    ));

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <h1>商品管理</h1>
          <p>社交ダンス衣装店向け</p>
        </div>
        <div className="toolbar">
          <button className="button" type="button" onClick={loadProducts} disabled={loading}>
            <RefreshCw size={18} />
            更新
          </button>
          <button className="button" type="button" onClick={exportCsv} disabled={exportingCsv}>
            <FileDown size={18} />
            CSV出力
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
        <label className="field">
          <span>並び替え</span>
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
            {SORT_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>表示</span>
          <select value={viewMode} onChange={(event) => setViewMode(event.target.value as ViewMode)}>
            <option value="grid">通常表示</option>
            <option value="category">カテゴリ別フォルダー</option>
          </select>
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

      <section className="list-actions panel">
        <div className="selection-summary">
          <strong>{selectedIds.length}件選択中</strong>
          <span>表示中 {sortedProducts.length}件</span>
        </div>
        <div className="toolbar">
          <button className="button" type="button" onClick={toggleAllDisplayed} disabled={sortedProducts.length === 0}>
            {allDisplayedSelected ? "表示中を解除" : "表示中を全選択"}
          </button>
          <button className="button" type="button" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0}>
            選択解除
          </button>
          <button className="button primary" type="button" onClick={exportSelectedLabels} disabled={selectedIds.length === 0 || exportingLabels}>
            <Download size={18} />
            選択した値札PDF
          </button>
        </div>
      </section>

      {error ? <p className="message error">{error}</p> : null}
      {loading ? <p className="message">読み込み中</p> : null}
      {!loading && sortedProducts.length === 0 ? <p className="empty-state">商品がありません</p> : null}

      {viewMode === "category" ? (
        <section className="folder-list">
          {groupedProducts.map((group) => (
            <section className="folder-section" key={group.category}>
              <div className="folder-header">
                <Folder size={18} />
                <strong>{group.category}</strong>
                <span>{group.products.length}件</span>
              </div>
              <div className="product-grid">{productCards(group.products)}</div>
            </section>
          ))}
        </section>
      ) : (
        <section className="product-grid">{productCards(sortedProducts)}</section>
      )}
    </main>
  );
}

function ProductCard({
  product,
  selected,
  onToggle
}: {
  product: Product;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <article className={`product-card ${selected ? "selected" : ""}`}>
      <label className="select-check">
        <input type="checkbox" checked={selected} onChange={onToggle} />
        <span>選択</span>
      </label>
      <Link className="thumb" href={`/products/${product.id}`}>
        {product.front_image_url ? <img src={product.front_image_url} alt={`${product.product_code} 正面写真`} /> : "No image"}
      </Link>
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
        <Link className="button detail-link" href={`/products/${product.id}`}>
          詳細
        </Link>
      </div>
    </article>
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
