# Gegen Press! デプロイガイド

このガイドは、Gegen Press! をローカルテストから本番環境へデプロイするための手順をまとめたものです。

---

## 📋 前提条件

- Node.js 18+ がインストール済み
- Firebase プロジェクトが作成済み
- Firebase Admin SDK の認証キーを取得済み
- Vercel / Cloud Run / Railway のアカウントを持っている

---

## 🔧 1. ローカル開発環境のセットアップ

### 1.1 環境変数の設定

```bash
# .env ファイルを作成（.env.example をコピー）
cp .env.example .env
```

`.env` を開いて、Firebase の認証情報を入力：

```env
NODE_ENV=development
PORT=3001

FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=...@iam.gserviceaccount.com
FIREBASE_CLIENT_ID=...
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=...
FIREBASE_CLIENT_X509_CERT_URL=...
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
```

Firebase コンソール > プロジェクト設定 > サービスアカウント から「新しい秘密鍵の生成」でダウンロードした JSON を参照してください。

### 1.2 依存関係のインストール

```bash
npm install
```

### 1.3 ローカルサーバーの起動

```bash
# 開発モード（自動リロード有効）
npm run dev

# または本番モード
npm start
```

サーバーが `http://localhost:3001` で起動します。

---

## 📊 2. Firestore へのサンプルデータ投入

ローカル / 本番環境両方で実行できます：

```bash
npm run seed
```

これで、以下がFirestoreに投入されます：
- 記者 6 名
- 記事 6 件

`seed.js` を編集すれば、カスタムデータで上書き可能です。

---

## 🚀 3. フロントエンド（Vercel）へのデプロイ

### 3.1 Vercel CLI をインストール

```bash
npm install -g vercel
```

### 3.2 Vercel にログイン

```bash
vercel login
```

### 3.3 フロントのビルドとデプロイ

```bash
cd ../outputs  # フロントのHTMLファイルがあるディレクトリ
vercel --prod
```

プロンプトで「Project name」「Region」などを設定。

### 3.4 環境変数を設定（本番）

Vercel ダッシュボード > プロジェクト設定 > Environment Variables で以下を追加：

```
GEGEN_API_URL = https://your-backend-url.com/api
```

（バックエンドのデプロイ後に取得したURLを入力）

---

## 🐳 4. バックエンド（Cloud Run）へのデプロイ

### 4.1 Google Cloud SDK をインストール

```bash
# macOS
brew install --cask google-cloud-sdk

# または手動インストール
https://cloud.google.com/sdk/docs/install
```

### 4.2 Google Cloud にログイン

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 4.3 Firestore セキュリティルールをデプロイ

```bash
firebase deploy --only firestore:rules
```

### 4.4 Docker イメージをビルド

```bash
docker build -t gegen-press-api .
```

### 4.5 Cloud Run にデプロイ

```bash
gcloud run deploy gegen-press-api \
  --source . \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated
```

デプロイ完了後、提示されるURL（例：`https://gegen-press-api-xxxx.run.app`）をメモ。

### 4.6 環境変数をCloud Runで設定

```bash
gcloud run services update gegen-press-api \
  --update-env-vars NODE_ENV=production
```

`.env` の値は、Cloud Run の環境変数として設定するか、Secret Manager で管理してください。

---

## 🚀 5. Railway へのデプロイ（代替案）

Cloud Run の代わりに Railway を使う場合：

### 5.1 Railway CLI をインストール

```bash
npm install -g @railway/cli
```

### 5.2 Railway にログイン・プロジェクト作成

```bash
railway login
railway init
```

### 5.3 本番環境を設定

```bash
railway add
# → Node.js を選択
```

### 5.4 環境変数を設定

```bash
railway variables set NODE_ENV production
railway variables set FIREBASE_PROJECT_ID your-project-id
# ... 他の環境変数を設定
```

### 5.5 デプロイ

```bash
railway up
```

URLが表示されます。

---

## 🔗 6. フロント・バックを繋ぐ

### 6.1 デプロイ後のバックエンドURL を確認

```
Cloud Run: https://gegen-press-api-xxxx.run.app
Railway: https://your-railway-url.railway.app
```

### 6.2 Vercel 環境変数を更新

Vercel ダッシュボード で `GEGEN_API_URL` を上記のURLに設定：

```
GEGEN_API_URL = https://gegen-press-api-xxxx.run.app/api
```

### 6.3 フロントを再デプロイ

```bash
vercel --prod
```

---

## ✅ 7. 動作確認

1. Vercel の URL をブラウザで開く
2. ホームページが表示される
3. 記者をクリック → 記者プロフィール（APIから動的読込）
4. ランキングをクリック → 信ぴょう性スコア一覧
5. ログイン → Firebase認証が機能するか確認

---

## 🐛 トラブルシューティング

### Cloud Run でビルドエラー

```
error: could not build image
```

→ `Dockerfile` と `.dockerignore` が同じディレクトリにあるか確認

### CORS エラー

```
Access to XMLHttpRequest from origin 'https://xxx.vercel.app' 
has been blocked by CORS policy
```

→ `server.js` の CORS 設定で、Vercelのドメインを許可リストに追加：

```javascript
app.use(cors({
  origin: [
    'https://xxx.vercel.app',  // ← Vercelのドメイン
    'http://localhost:3000',
  ],
}));
```

再度デプロイ：
```bash
gcloud run deploy gegen-press-api --source . ...
```

### Firestore の接続エラー

```
Error: Failed to initialize Firebase
```

→ `.env` の `FIREBASE_*` 値が正しいか確認。特に `FIREBASE_PRIVATE_KEY` は改行を `\n` で表現：

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

---

## 📝 本番環境チェックリスト

- [ ] Firebase プロジェクトの Firestore セキュリティルールを本番仕様に設定
- [ ] バックエンドの `.env` に本番認証情報を設定
- [ ] Cloud Run / Railway でバックエンドが起動確認
- [ ] Vercel でフロント URL に環境変数 `GEGEN_API_URL` を設定
- [ ] Vercel でフロントの再デプロイ
- [ ] ブラウザで動作確認（ホーム → 記者ページ → API通信）
- [ ] ログイン / 登録機能のテスト
- [ ] 記者追加機能のテスト

---

## 🔄 本番環境でのデータリセット

```bash
# Firestore のデータをリセット
firebase firestore:delete --all --project YOUR_PROJECT_ID

# サンプルデータを再投入
npm run seed
```

---

## 📚 参考リンク

- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Vercel デプロイ](https://vercel.com/docs)
- [Cloud Run クイックスタート](https://cloud.google.com/run/docs/quickstarts/build-and-deploy)
- [Railway CLI](https://docs.railway.app/cli/cli-reference)

---

**Happy deploying!** ⚽
