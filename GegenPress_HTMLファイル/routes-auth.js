/**
 * Authentication Routes
 * ユーザー認証エンドポイント
 */

const express = require('express');
const { auth, db } = require('./firebase-config');
const { verifyFirebaseToken } = require('./middleware-auth');

const router = express.Router();

/**
 * POST /api/auth/signup
 * ユーザー登録
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // バリデーション
    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        message: 'メールアドレス、パスワード、ユーザー名は必須です',
      });
    }

    // Firebase Authentication でユーザーを作成
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: username,
    });

    // Firestore にユーザー情報を保存
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      username: username,
      email: email,
      profileImage: null,
      bio: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      followers: 0,
      following: 0,
      totalRatings: 0,
      savedArticles: [],
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        language: 'ja',
      },
    });

    // IDToken を生成
    const idToken = await auth.createCustomToken(userRecord.uid);

    res.status(201).json({
      success: true,
      message: 'ユーザー登録に成功しました',
      userId: userRecord.uid,
      token: idToken,
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({
        success: false,
        message: 'このメールアドレスは既に登録されています',
      });
    }

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/login
 * ログイン（フロントエンドから受け取ったIDTokenを検証）
 */
router.post('/login', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'IDTokenが見つかりません',
      });
    }

    // IDToken を検証
    const decodedToken = await auth.verifyIdToken(idToken);

    // ユーザー情報を取得
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'ユーザーが見つかりません',
      });
    }

    res.status(200).json({
      success: true,
      message: 'ログインに成功しました',
      userId: decodedToken.uid,
      user: userDoc.data(),
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'ログインに失敗しました',
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/logout
 * ログアウト
 */
router.post('/logout', verifyFirebaseToken, async (req, res) => {
  try {
    // フロントエンド側でトークンを削除するだけで十分
    // バックエンド側では特に処理は不要

    res.status(200).json({
      success: true,
      message: 'ログアウトしました',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/reset-password
 * パスワードリセットリンクを送信
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'メールアドレスは必須です',
      });
    }

    // パスワードリセットリンクを生成
    const resetLink = await auth.generatePasswordResetLink(email);

    res.status(200).json({
      success: true,
      message: 'パスワードリセットリンクをメールで送信しました',
      resetLink: resetLink, // 開発環境でのテスト用
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/verify
 * トークン検証
 */
router.get('/verify', verifyFirebaseToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'ユーザーが見つかりません',
      });
    }

    res.status(200).json({
      success: true,
      message: 'トークンは有効です',
      user: userDoc.data(),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
