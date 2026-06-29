/**
 * Gegen Press! Backend Server
 * 海外サッカー記者の報道まとめサイト - メインサーバー
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { errorHandler } = require('./middleware-auth');

// ルートのインポート
const authRoutes = require('./routes-auth');
const articlesRoutes = require('./routes-articles');
const commentsRoutes = require('./routes-comments');
const ratingsRoutes = require('./routes-ratings');
const usersRoutes = require('./routes-users');
const reportersRoutes = require('./routes-reporters');

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 設定
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://gegen-press.vercel.app',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ヘルスチェック
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Gegen Press! API は稼働中です ⚽',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      articles: '/api/articles',
      comments: '/api/comments',
      ratings: '/api/ratings',
      users: '/api/users',
      reporters: '/api/reporters',
    },
  });
});

// API ルート
app.use('/api/auth', authRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reporters', reportersRoutes);

// 404 ハンドラー
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'エンドポイントが見つかりません',
    path: req.path,
  });
});

// エラーハンドラー
app.use(errorHandler);

// サーバー起動
app.listen(PORT, () => {
  console.log('========================================');
  console.log('  ⚽ Gegen Press! API Server');
  console.log('========================================');
  console.log(`  🚀 サーバー起動: http://localhost:${PORT}`);
  console.log(`  📅 起動時刻: ${new Date().toLocaleString('ja-JP')}`);
  console.log(`  🌍 環境: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================');
});

module.exports = app;
