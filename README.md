# 社交ダンス衣装店 商品管理MVP

スマホで商品写真を登録し、OpenAI Visionで候補を出して、人が確認して保存する商品管理アプリです。

## セットアップ

1. Supabaseでプロジェクトを作ります。
2. `supabase/migrations/202606040001_init_product_management.sql` をSupabase SQL Editorで実行します。
3. `.env.example` を参考に `.env.local` を作ります。
4. 依存関係を入れて起動します。

```bash
npm install
npm run dev
```

スマホを同じWi-Fiで一時的に試すだけなら、PCで次を実行します。

```bash
npm run dev:mobile
```

同じWi-Fiでなくても使う本番運用は、Vercelなどに公開します。
手順は [DEPLOY.md](./DEPLOY.md) を見てください。

## 必要な環境変数

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PRODUCT_IMAGES_BUCKET`
- `OPENAI_API_KEY`
- `OPENAI_VISION_MODEL`
- `LABEL_FONT_PATH`

## MVP範囲

- 商品登録
- 正面写真とタグ写真のアップロード
- 納品書写真のアップロード（任意）
- OpenAI Vision APIによる候補作成
- AI候補の手修正
- 商品ID自動発行
- 商品一覧
- 商品詳細編集
- QRコード付き値札PDF出力

## 保存について

商品情報はSupabase Database、写真はSupabase Storageに保存されます。
公開URLで使う場合も、PCを閉じてもデータは消えません。
Supabase側で削除しない限り残ります。

## OPENAI_API_KEY未設定と出た場合

ローカルでは `.env.local`、Vercel公開版ではVercelのEnvironment Variablesに `OPENAI_API_KEY` が必要です。
Vercelで追加または修正したあとは、最新のデプロイをRedeployしてください。

`LABEL_FONT_PATH` は値札PDFで日本語フォントを使いたい場合だけ設定します。
未設定の場合は `public/fonts/label-font.otf` を探し、見つからない場合は英字のサイズ表記に戻ります。
