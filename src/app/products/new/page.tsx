"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, FileImage, Save, Sparkles } from "lucide-react";
import {
  DANCE_STYLES,
  PRODUCT_CATEGORIES,
  PRODUCT_COLORS,
  PRODUCT_SIZES
} from "@/lib/constants";
import { prepareImageForUpload } from "@/lib/client-images";
import { todayIsoDate } from "@/lib/format";
import type { AnalyzeProductResult } from "@/lib/types";

const initialForm = {
  purchaseDate: todayIsoDate(),
  purchasePrice: "0",
  salePrice: "0",
  category: "ドレス",
  danceStyle: "ラテン",
  color: "不明",
  size: "不明",
  notes: "",
  supplier: "",
  storageLocation: ""
};

export default function NewProductPage() {
  const router = useRouter();
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [tagFile, setTagFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState("");
  const [tagPreview, setTagPreview] = useState("");
  const [invoicePreview, setInvoicePreview] = useState("");
  const [form, setForm] = useState(initialForm);
  const [analysis, setAnalysis] = useState<AnalyzeProductResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (frontPreview) URL.revokeObjectURL(frontPreview);
      if (tagPreview) URL.revokeObjectURL(tagPreview);
      if (invoicePreview) URL.revokeObjectURL(invoicePreview);
    };
  }, [frontPreview, tagPreview, invoicePreview]);

  function updateForm(key: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function updateImage(kind: "front" | "tag" | "invoice", event: ChangeEvent<HTMLInputElement>) {
    const pickedFile = event.target.files?.[0] ?? null;
    const file = pickedFile ? await prepareImageForUpload(pickedFile) : null;
    const preview = file ? URL.createObjectURL(file) : "";

    if (kind === "front") {
      if (frontPreview) URL.revokeObjectURL(frontPreview);
      setFrontFile(file);
      setFrontPreview(preview);
    } else if (kind === "tag") {
      if (tagPreview) URL.revokeObjectURL(tagPreview);
      setTagFile(file);
      setTagPreview(preview);
    } else {
      if (invoicePreview) URL.revokeObjectURL(invoicePreview);
      setInvoiceFile(file);
      setInvoicePreview(preview);
    }
  }

  async function analyzeImages() {
    setError("");
    setMessage("");

    if (!frontFile || !tagFile) {
      setError("正面写真とタグ写真を選んでください。");
      return;
    }

    setBusy(true);

    try {
      const data = new FormData();
      data.append("frontImage", frontFile);
      data.append("tagImage", tagFile);
      if (invoiceFile) {
        data.append("invoiceImage", invoiceFile);
      }

      const response = await fetch("/api/analyze-product", {
        method: "POST",
        body: data
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "AI解析に失敗しました。");
      }

      setAnalysis(payload);
      setForm((current) => ({
        ...current,
        category: payload.category,
        danceStyle: payload.dance_style,
        color: payload.color,
        size: payload.size,
        purchasePrice: payload.purchase_price ? String(payload.purchase_price) : current.purchasePrice,
        salePrice: payload.sale_price ? String(payload.sale_price) : current.salePrice
      }));
      setMessage("AI候補をフォームに反映しました。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "AI解析に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!frontFile || !tagFile) {
      setError("正面写真とタグ写真を選んでください。");
      return;
    }

    setBusy(true);

    try {
      const uploadData = new FormData();
      uploadData.append("frontImage", frontFile);
      uploadData.append("tagImage", tagFile);
      if (invoiceFile) {
        uploadData.append("invoiceImage", invoiceFile);
      }

      const uploadResponse = await fetch("/api/uploads", {
        method: "POST",
        body: uploadData
      });
      const uploadPayload = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadPayload.error ?? "画像アップロードに失敗しました。");
      }

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          frontImagePath: uploadPayload.frontImagePath,
          tagImagePath: uploadPayload.tagImagePath,
          invoiceImagePath: uploadPayload.invoiceImagePath,
          purchaseDate: form.purchaseDate,
          purchasePrice: Number(form.purchasePrice),
          salePrice: Number(form.salePrice),
          category: form.category,
          danceStyle: form.danceStyle,
          color: form.color,
          size: form.size,
          notes: form.notes,
          supplier: form.supplier,
          storageLocation: form.storageLocation
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "保存に失敗しました。");
      }

      router.push(`/products/${payload.product.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <h1>新規登録</h1>
          <p>商品IDは保存時に自動発行</p>
        </div>
        <div className="toolbar">
          <Link className="button" href="/">
            一覧へ
          </Link>
        </div>
      </header>

      {error ? <p className="message error">{error}</p> : null}
      {message ? <p className="message success">{message}</p> : null}

      <form className="form-grid" onSubmit={saveProduct}>
        <section className="panel upload-panel">
          <h2 className="section-title">写真</h2>
          <div className="upload-grid">
            <ImagePicker
              title="正面写真"
              icon={<Camera size={18} />}
              preview={frontPreview}
              onChange={(event) => updateImage("front", event)}
            />
            <ImagePicker
              title="タグ写真"
              icon={<FileImage size={18} />}
              preview={tagPreview}
              onChange={(event) => updateImage("tag", event)}
            />
            <ImagePicker
              title="納品書写真（任意）"
              icon={<FileImage size={18} />}
              preview={invoicePreview}
              onChange={(event) => updateImage("invoice", event)}
            />
            <button className="button primary" type="button" onClick={analyzeImages} disabled={busy}>
              <Sparkles size={18} />
              AI解析
            </button>
            {analysis ? (
              <div className="analysis-result">
                <strong>AI候補</strong>
                <span>信頼度: {Math.round(analysis.confidence * 100)}%</span>
                {analysis.purchase_price ? <span>仕入価格候補: ¥{analysis.purchase_price.toLocaleString("ja-JP")}</span> : null}
                {analysis.sale_price ? <span>販売価格候補: ¥{analysis.sale_price.toLocaleString("ja-JP")}</span> : null}
                <span>{analysis.raw_notes}</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel form-panel">
          <h2 className="section-title">商品情報</h2>
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
              <span>仕入価格（不明なら0）</span>
              <input type="number" inputMode="numeric" min="0" value={form.purchasePrice} onChange={(event) => updateForm("purchasePrice", event.target.value)} required />
            </label>
            <label className="field">
              <span>販売価格（未定なら0）</span>
              <input type="number" inputMode="numeric" min="0" value={form.salePrice} onChange={(event) => updateForm("salePrice", event.target.value)} required />
            </label>
            <label className="field">
              <span>仕入先（任意）</span>
              <input value={form.supplier} onChange={(event) => updateForm("supplier", event.target.value)} />
            </label>
            <label className="field">
              <span>保管場所（任意）</span>
              <input value={form.storageLocation} onChange={(event) => updateForm("storageLocation", event.target.value)} />
            </label>
            <label className="field span-2">
              <span>備考（任意）</span>
              <textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} />
            </label>
            <button className="button primary span-2" type="submit" disabled={busy}>
              <Save size={18} />
              保存
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}

function ImagePicker({
  title,
  icon,
  preview,
  onChange
}: {
  title: string;
  icon: React.ReactNode;
  preview: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="upload-box">
      <span className="label">
        {icon}
        {title}
      </span>
      <span className="image-preview">{preview ? <img src={preview} alt={title} /> : title}</span>
      <input type="file" accept="image/*" capture="environment" onChange={onChange} />
    </label>
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
