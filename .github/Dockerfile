# Gegen Press! バックエンド API
# Cloud Run / Railway / Heroku などでの動作を想定

FROM node:18-alpine

WORKDIR /app

# パッケージをコピーしてインストール
COPY package*.json ./
RUN npm install --production

# ソースコードをコピー
COPY . .

# ポート設定（Cloud Run のデフォルトは 8080）
EXPOSE 3001

# サーバー起動
CMD ["node", "server.js"]
