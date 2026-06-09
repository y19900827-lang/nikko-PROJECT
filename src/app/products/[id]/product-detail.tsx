"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Save } from "lucide-react";
import {
  DANCE_STYLES,
  PRODUCT_CATEGORIES,
  PRODUCT_COLORS,
  PRODUCT_SIZES,
  PRODUCT_STATUSES
} from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Product } from "@/lib/types";

type DetailForm = {
  purchaseDate: string;
  purchasePrice: string;
  salePrice: string;
  category: string;
  danceStyle: string;
  color: string;
  size: string;
  notes: string;
  supplier: string;
  storageLocation: string;
  soldDate: string;
  status: string;
};

export default function ProductDetail({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<DetailForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadProduct() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/products/${productId}`, {
        cache: "no-store"
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "商品を取得できませんでした。");
      }

      const loadedProduct: Product = payload.product;
      setProduct(loadedProduct);
      setForm({
        purchaseDate: loadedProduct.purchase_date,
        purchasePrice: String(loadedProduct.purchase_price),
        salePrice: String(loadedProduct.sale_price),
        category: loadedProduct.category,
        danceStyle: loadedProduct.dance_style,
        color: loadedProduct.color,
        size: loadedProduct.size,
        notes: loadedProduct.notes,
        supplier: loadedProduct.supplier ?? "",
        storageLocation: loadedProduct.storage_location ?? "",
        soldDate: loadedProduct.sold_date ?? "",
        status: loadedProduct.status
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "商品を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  function updateForm(key: keyof DetailForm, value: string) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          purchaseDate: form.purchaseDate,
          purchasePrice: Number(form.purchasePrice),
          salePrice: Number(form.salePrice),
          category: form.category,
          danceStyle: form.danceStyle,
          color: form.color,
          size: form.size,
          notes: form.notes,
          supplier: form.supplier,
          storageLocation: form.storageLocation,
          soldDate: form.soldDate || null,
          status: form.status
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "保存に失敗しました。");
      }

      setProduct(payload.product);
      setMessage("保存しました。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="app-shell">
        <p className="message">読み込み中</p>
      </main>
    );
  }

  if (error && !product) {
    return (
      <main className="app-shell">
        <p className="message error">{error}</p>
        <Link className="button" href="/">
          一覧へ
        </Link>
      </main>
    );
  }

  if (!product || !form) {
    return null;
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <h1>商品詳細</h1>
          <p>{formatDate(product.registered_at)} 登録</p>
        </div>
        <div className="toolbar">
          <Link className="button" href="/">
            一覧へ
          </Link>
          <a className="button primary" href={`/api/labels/${product.id}`} target="_blank" rel="noreferrer">
            <FileText size={18} />
            値札PDF
          </a>
        </div>
      </header>

      {error ? <p className="message error">{error}</p> : null}
      {message ? <p className="message success">{message}</p> : null}

      <section className="detail-hero">
        <div className="detail-images">
          <div className="detail-image">{product.front_image_url ? <img src={product.front_image_url} alt="正面写真" /> : null}</div>
          <div className="detail-image">{product.tag_image_url ? <img src={product.tag_image_url} alt="タグ写真" /> : null}</div>
          {product.invoice_image_url ? (
            <div className="detail-image">
              <img src={product.invoice_image_url} alt="納品書写真" />
            </div>
          ) : null}
        </div>
        <div className="panel detail-summary">
          <h1>{product.product_code}</h1>
          <div className="meta-list">
            <span className="chip">{product.category}</span>
            <span className="chip">{product.dance_style}</span>
            <span className="chip">{product.color}</span>
            <span className="chip">{product.size}</span>
            <span className="status">{product.status}</span>
          </div>
          <strong className="price">{formatCurrency(product.sale_price)}</strong>
        </div>
      </section>

      <form className="panel detail-panel" onSubmit={saveProduct}>
        <h2 className="section-title">編集</h2>
        <div className="input-grid">
          <SelectField label="商品カテゴリ" value={form.category} onChange={(value) => updateForm("category", value)} options={PRODUCT_CATEGORIES} />
          <SelectField label="ダンス種目" value={form.danceStyle} onChange={(value) => updateForm("danceStyle", value)} options={DANCE_STYLES} />
          <SelectField label="色" value={form.color} onChange={(value) => updateForm("color", value)} options={PRODUCT_COLORS} />
          <SelectField label="サイズ" value={form.size} onChange={(value) => updateForm("size", value)} options={PRODUCT_SIZES} />
          <label className="field">
            <span>仕入日</span>
            <input type="date" value={form.purchaseDate} onChange={(event) => updateForm("purchaseDate", event.target.value)} required />
          </label>
          <label className="field">
            <span>仕入価格</span>
            <input type="number" inputMode="numeric" min="0" value={form.purchasePrice} onChange={(event) => updateForm("purchasePrice", event.target.value)} required />
          </label>
          <label className="field">
            <span>販売価格</span>
            <input type="number" inputMode="numeric" min="0" value={form.salePrice} onChange={(event) => updateForm("salePrice", event.target.value)} required />
          </label>
          <SelectField label="ステータス" value={form.status} onChange={(value) => updateForm("status", value)} options={PRODUCT_STATUSES} />
          <label className="field">
            <span>販売日</span>
            <input type="date" value={form.soldDate} onChange={(event) => updateForm("soldDate", event.target.value)} />
          </label>
          <label className="field">
            <span>仕入先</span>
            <input value={form.supplier} onChange={(event) => updateForm("supplier", event.target.value)} />
          </label>
          <label className="field">
            <span>保管場所</span>
            <input value={form.storageLocation} onChange={(event) => updateForm("storageLocation", event.target.value)} />
          </label>
          <label className="field span-2">
            <span>備考</span>
            <textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} />
          </label>
          <button className="button primary span-2" type="submit" disabled={saving}>
            <Save size={18} />
            保存
          </button>
        </div>
      </form>
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
      <select value={value} onChange={(event) => onChange(event.target.value)} required>
        {options.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
