# スマホで外から使うための公開手順

今の `http://127.0.0.1:3000` はPCの中だけで動く確認用です。
同じWi-Fiでなくてもスマホから使うには、Vercelなどに公開します。

## 仕組み

- 画面とAPI: Vercelに公開
- 商品データ: Supabase Databaseに保存
- 商品写真: Supabase Storageに保存
- AI解析: VercelのサーバーAPIからOpenAIを呼び出し

商品データと写真はSupabaseに保存されるので、PCを閉じても消えません。
削除操作やSupabase側で消さない限り残ります。

## Vercelで公開する手順

1. GitHubにこのフォルダのプロジェクトをアップロードします。
2. Vercelで `Add New Project` からGitHubのリポジトリを選びます。
3. Framework Presetは `Next.js` のままでOKです。
4. Environment Variablesに `.env.local` と同じキーを登録します。
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_PRODUCT_IMAGES_BUCKET`
   - `OPENAI_API_KEY`
   - `OPENAI_VISION_MODEL`
   - `LABEL_FONT_PATH` は空でOKです。
5. `Deploy` を押します。
6. 完了後に出る `https://...vercel.app` のURLをスマホで開きます。

## 環境変数をあとから直した場合

`OPENAI_API_KEY未設定です` と出る場合は、Vercel側に `OPENAI_API_KEY` が入っていないか、入れたあと再デプロイされていない可能性があります。
`Invalid supabaseUrl` と出る場合は、Vercel側の `NEXT_PUBLIC_SUPABASE_URL` が未設定か、`https://xxxxx.supabase.co` 以外の文字になっている可能性があります。

1. Vercelのプロジェクトを開きます。
2. 左メニューの `Environment Variables` を開きます。
3. 必要な環境変数を追加または修正します。
4. `Deployments` を開き、最新デプロイのメニューから `Redeploy` を押します。

## 重要

- `.env.local` はGitHubにアップロードしません。
- `SUPABASE_SERVICE_ROLE_KEY` と `OPENAI_API_KEY` はVercelのEnvironment Variablesにだけ入れます。
- 公開後に環境変数を変更した場合は、Vercelで再デプロイが必要です。
