# ⚽ Gegen Press!

海外サッカー記者の報道を一元管理し、ファンと運営が信ぴょう性をジャッジする、サッカーファンのための情報サイト。

**Project Status:** 🚀 実装完了・本番環境対応可

\---

## 📖 プロジェクト概要

### コンセプト

* **「誰が信頼できる情報源か」をみんなで評価する**
* 記者の信ぴょう性スコア（/100）を、ファン投票と運営評価で可視化
* ユーザーが自分で記者を追加できる（Penmark 方式）
* 記事・コメント・評価がログインなしで使える場もある

### 主な機能

* 📰 記事閲覧・検索・カテゴリ分類
* ⭐ 記者の信ぴょう性評価（ログインなしOK）
* 💬 記事へのコメント（ログイン必須）
* 👤 ユーザープロフィール・ブックマーク
* 🏆 記者ランキング（信ぴょう性スコア順）
* ➕ ユーザーが記者を自由に追加できる
* 🔐 Firebase 認証対応

\---

## 🏗️ 技術スタック

### フロントエンド

* **HTML / CSS / JavaScript** — 11ページのSPA風UI
* **Vercel** — 本番ホスティング
* **API連携** — 記者・記事を動的表示

### バックエンド

* **Node.js + Express.js** — RESTful API（35エンドポイント）
* **Firebase Admin SDK** — 認証・Firestore操作
* **Firestore** — NoSQL データベース
* **Cloud Run / Railway** — サーバーレスホスティング

### 認証・インフラ

* **Firebase Authentication** — メール/パスワード + Google OAuth
* **Firestore セキュリティルール** — ロールベースアクセス制御

\---

## 📁 ディレクトリ構成

```
gegen-press-backend/
├── server.js                    # メインサーバー
├── firebase-config.js           # Firebase 設定
├── middleware-auth.js           # トークン検証
├── routes-\*.js                  # API エンドポイント
│   ├── routes-auth.js           # 認証（5個）
│   ├── routes-articles.js       # 記事（7個）
│   ├── routes-comments.js       # コメント（4個）
│   ├── routes-ratings.js        # 評価（4個）
│   ├── routes-users.js          # ユーザー（8個）
│   └── routes-reporters.js      # 記者（5個、記者追加機能付き）
├── api-client.js                # フロント用 APIクライアント
├── seed.js                      # Firestore サンプルデータ投入
├── Dockerfile                   # Cloud Run / Railway 対応
├── vercel.json                  # Vercel フロント設定
├── .env.example                 # 環境変数テンプレート
├── firestore.rules              # セキュリティルール
├── package.json                 # 依存関係・スクリプト
├── DEPLOYMENT.md                # デプロイ完全ガイド
└── README.md                    # このファイル

フロント側（別リポジトリ）：
gegen-press-top.html
gegen\_press\_ranking.html
gegen\_press\_add\_reporter.html      # 記者追加ページ
gegen\_press\_login.html             # Firebase認証対応
gegen\_press\_reporter\_profile.html  # 動的表示・編集機能付き
... （他 11ページ）
```

\---

## 🚀 クイックスタート

### ローカル環境

#### 1\. 環境変数を設定

```bash
cp .env.example .env
# .env を開いて Firebase の認証情報を入力
```

#### 2\. 依存関係をインストール

```bash
npm install
```

#### 3\. Firestore にサンプルデータを投入

```bash
npm run seed
```

#### 4\. 開発サーバーを起動

```bash
npm run dev
# http://localhost:3001 でAPI起動
# フロント（HTML）は http://localhost:5500 など（Live Server）
```

#### 5\. 動作確認

* **API ヘルスチェック**: http://localhost:3001
* **記者一覧**: http://localhost:3001/api/reporters
* **フロント**: HTML ファイルをブラウザで開く（?id=rep\_fabrizio で動的読込テスト）

### 本番環境へのデプロイ

詳細は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照。

**サマリー:**

```bash
# バックエンド（Cloud Run）
docker build -t gegen-press-api .
gcloud run deploy gegen-press-api --source .

# フロント（Vercel）
vercel --prod
# 環境変数 GEGEN\_API\_URL をセット
```

\---

## 📡 API エンドポイント一覧

### 認証 `/api/auth` （5個）

* `POST /signup` — ユーザー登録
* `POST /login` — ログイン
* `POST /logout` — ログアウト
* `POST /reset-password` — パスワードリセット
* `GET /verify` — トークン検証

### 記事 `/api/articles` （7個）

* `GET /` — 一覧（ページネーション・フィルター）
* `GET /:id` — 詳細（閲覧数カウント）
* `POST /` — 作成（ログイン必須）
* `PUT /:id` — 編集（作成者のみ）
* `DELETE /:id` — 削除（作成者のみ）
* `GET /category/:category` — カテゴリ別
* `GET /search?q=...` — キーワード検索

### コメント `/api/comments` （4個）

* `GET /:articleId` — 一覧
* `POST /` — 投稿（ログイン必須）
* `PUT /:id` — 編集
* `DELETE /:id` — 削除

### 評価 `/api/ratings` （4個）

* `POST /` — 投稿（**ログイン不要**）
* `GET /:articleId` — 記事の評価一覧
* `GET /reporter/:reporterId` — 記者の評価一覧
* `GET /user/:userId` — ユーザー評価一覧

### ユーザー `/api/users` （8個）

* `GET /:id` — プロフィール取得
* `PUT /:id` — プロフィール編集
* `GET /:id/profile` — 詳細（統計付き）
* `POST /:id/follow` — フォロー
* `DELETE /:id/follow` — フォロー解除
* `GET /:id/bookmarks` — ブックマーク一覧
* `POST /:id/bookmarks` — 追加
* `DELETE /:id/bookmarks/:articleId` — 削除

### 記者 `/api/reporters` （5個）

* `GET /` — 一覧
* `GET /ranking` — ランキング
* `GET /check-duplicate?name=...` — 名前の重複チェック
* `POST /` — **追加（ログイン必須・ユーザー可能）**
* `GET /:id` — 詳細
* `PUT /:id` — 編集（追加者のみ）
* `GET /:id/articles` — 記者の記事一覧
* `GET /:id/reviews` — 記者のレビュー一覧

\---

## 🔑 権限設計（データアクセス制御）

### ログイン不要で使える

* 📰 記事の閲覧
* 👤 記者プロフィール閲覧
* ⭐ 記事・記者を★で評価（「評価を投稿」）
* 🏆 ランキング表示

### ログイン必須

* 💬 コメント投稿
* 📝 記者へのテキストレビュー投稿
* ❤️ ブックマーク・フォロー
* ➕ **記者の追加** ← Penmark方式！
* ✏️ 自分が追加した記者の編集

\---

## 🎯 実装の特徴

### 1\. 動的データ表示

* 記者プロフィール: `?id=rep\_fabrizio` で API から動的読込
* 記事詳細: `?id=art\_001` で API から動的読込
* APIなし時はデモ（固定データ）で動作

### 2\. API連携のグレースフルフォールバック

* `api-client.js` が未読込時（オフライン）でも画面は動く
* 本番環境と開発環境で自動切り替え
* 環境変数 `GEGEN\_API\_URL` で APIベースURLを変更可能

### 3\. ユーザー参加型（Penmark方式）

* 誰でも記者を追加できる
* 追加者本人のみ編集可能
* 運営登録 vs ユーザー追加を区別

### 4\. セキュリティ

* Firebase 認証＋トークン管理
* Firestore セキュリティルール で ロールベース制御
* CORS設定で不正な外部アクセスをブロック
* パスワード重複チェック・入力検証

\---

## 📊 Firestore データ構成

### Collections

**reporters** （記者）

```json
{
  "id": "rep\_fabrizio",
  "name": "Fabrizio Romano",
  "mediaOutlet": "移籍情報スペシャリスト",
  "expertise": \["移籍情報", "プレミアリーグ"],
  "trustScore": 96,
  "articlesCount": 284,
  "averageRating": 4.8,
  "followers": 1200000,
  "isVerified": true,
  "createdBy": "user123",      // 追加したユーザーのUID
  "source": "official|user",   // 運営 or ユーザー追加
  "createdAt": "...",
  "updatedAt": "..."
}
```

**articles** （記事）

```json
{
  "id": "art\_001",
  "title": "マンチェスター・シティが超大型補強を発表",
  "authorId": "rep\_fabrizio",
  "category": "移籍情報",
  "description": "...",
  "content": "...",
  "tags": \["プレミアリーグ", "..."],
  "views": 2450,
  "commentsCount": 156,
  "averageRating": 4.8,
  "trustScore": 96,
  "isPublished": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

**users**, **comments**, **ratings**, **follows** なども定義済み（firestore.rules参照）

\---

## 🧪 テスト・動作確認

### ローカルで API をテスト

```bash
# cURL 例
curl http://localhost:3001/api/reporters?page=1\&limit=10

# または Postman / Insomnia で GET してみる
```

### フロント側での動作確認

1. **記者ページ**: `gegen\_press\_reporter\_profile.html?id=rep\_fabrizio` をブラウザで開く

   * 📊 API から記者データが読み込まれるか確認
   * 📰 記事一覧が表示されるか確認
2. **記者追加**: `gegen\_press\_add\_reporter.html` を開く

   * ✅ 重複チェック機能が動作するか
   * 📝 フォーム送信でAPI呼び出しがされるか
3. **ログイン**: `gegen\_press\_login.html` を開く

   * 🔐 Firebase 認証で実際にログインできるか
   * 💾 トークンが localStorage に保存されるか

\---

## 🚀 本番チェックリスト

* \[ ] Firestore セキュリティルールを本番仕様に設定
* \[ ] `.env` に本番 Firebase 認証情報を入力
* \[ ] Cloud Run / Railway に Dockerfile でデプロイ
* \[ ] Vercel に HTML をデプロイ
* \[ ] Vercel の環境変数 `GEGEN\_API\_URL` をセット
* \[ ] エンドツーエンドテスト（ホーム → 記者ページ → 記事詳細）
* \[ ] ログイン / 登録テスト
* \[ ] 記者追加テスト
* \[ ] コメント・評価投稿テスト
* \[ ] CORS エラーがないか確認
* \[ ] モバイル表示のテスト

\---

## 🐛 トラブルシューティング

詳細は [DEPLOYMENT.md](./DEPLOYMENT.md#-トラブルシューティング) を参照。

**よくあるエラー:**

|エラー|原因|解決策|
|-|-|-|
|`Error: Failed to initialize Firebase`|環境変数が未設定|`.env` を確認|
|`CORS policy has been blocked`|バックエンドのCORS設定が間違い|`server.js` で Vercel のドメインを許可リストに追加|
|`Cannot GET /api/reporters`|バックエンドが起動していない|`npm run dev` で起動確認|
|`record not found`|Firestore にデータがない|`npm run seed` を実行|

\---

## 📚 参考リンク

* 📖 [DEPLOYMENT.md](./DEPLOYMENT.md) — デプロイ完全ガイド
* 🔐 [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
* 🚀 [Vercel Docs](https://vercel.com/docs)
* ☁️ [Cloud Run Docs](https://cloud.google.com/run/docs)
* 📋 [Express.js](https://expressjs.com/)

\---

## 📝 ライセンス

MIT License

\---

## 👨‍💻 貢献

バグ報告・機能提案は Issue へ。プルリクエスト歓迎です！

\---

**Made with ⚽ for football fans — Gegen Press! Team**

```
アプデートノート v1.0.0 (2025-06-29)
✅ 全11ページHTML完成
✅ バックエンド35エンドポイント完成
✅ Firebase認証連携完了
✅ 記者追加機能実装
✅ API動的表示実装
✅ デプロイ設定完備
👉 本番環境対応可能！



```

