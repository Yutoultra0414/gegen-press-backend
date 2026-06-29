/**
 * Authentication Middleware
 * トークン検証とユーザー認証
 */

const { auth } = require('./firebase-config');

/**
 * Firebase IDToken を検証するミドルウェア
 */
const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'トークンが見つかりません',
    });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.userId = decodedToken.uid;
    req.userEmail = decodedToken.email;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'トークンが無効です',
      error: error.message,
    });
  }
};

/**
 * オプショナルトークン検証
 * トークンがあれば検証、なくても進行
 */
const verifyTokenOptional = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (token) {
    try {
      const decodedToken = await auth.verifyIdToken(token);
      req.userId = decodedToken.uid;
      req.userEmail = decodedToken.email;
      req.isAuthenticated = true;
    } catch (error) {
      req.isAuthenticated = false;
    }
  } else {
    req.isAuthenticated = false;
  }

  next();
};

/**
 * エラーハンドリングミドルウェア
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'バリデーションエラー',
      errors: err.errors,
    });
  }

  return res.status(500).json({
    success: false,
    message: '内部サーバーエラーが発生しました',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};

module.exports = {
  verifyFirebaseToken,
  verifyTokenOptional,
  errorHandler,
};
