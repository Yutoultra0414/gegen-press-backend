/**
 * Ratings Routes
 * 評価エンドポイント
 */

const express = require('express');
const { db } = require('./firebase-config');
const { verifyFirebaseToken, verifyTokenOptional } = require('./middleware-auth');

const router = express.Router();

/**
 * 平均評価を再計算するヘルパー関数
 */
async function recalculateAverage(collectionName, targetId, fieldName) {
  let query;
  if (fieldName === 'articleId') {
    query = db.collection('ratings').where('articleId', '==', targetId).where('type', '==', 'article');
  } else {
    query = db.collection('ratings').where('reporterId', '==', targetId).where('type', '==', 'reporter');
  }

  const snapshot = await query.get();
  let total = 0;
  let count = 0;
  snapshot.forEach(doc => {
    total += doc.data().rating;
    count++;
  });

  const average = count > 0 ? total / count : 0;

  // ターゲットを更新
  if (collectionName === 'articles') {
    await db.collection('articles').doc(targetId).update({
      averageRating: parseFloat(average.toFixed(1)),
    });
  } else if (collectionName === 'reporters') {
    await db.collection('reporters').doc(targetId).update({
      averageRating: parseFloat(average.toFixed(1)),
      trustScore: Math.round(average * 20), // 5段階を100点に変換
    });
  }

  return average;
}

/**
 * POST /api/ratings
 * 評価を投稿（ログイン不要 - 記事・記者評価は誰でも可能）
 */
router.post('/', verifyTokenOptional, async (req, res) => {
  try {
    const { articleId, reporterId, reporterName, rating, comment, type } = req.body;

    // バリデーション
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: '評価は1から5の間で指定してください',
      });
    }

    if (type !== 'article' && type !== 'reporter') {
      return res.status(400).json({
        success: false,
        message: 'typeは article または reporter を指定してください',
      });
    }

    // 評価を作成
    const ratingData = {
      userId: req.isAuthenticated ? req.userId : null,
      articleId: articleId || null,
      reporterId: reporterId || null,
      reporterName: reporterName || null,
      rating: rating,
      comment: comment || '',
      type: type,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ratingRef = await db.collection('ratings').add(ratingData);

    // 平均評価を再計算
    if (type === 'article' && articleId) {
      await recalculateAverage('articles', articleId, 'articleId');
    } else if (type === 'reporter' && reporterId) {
      await recalculateAverage('reporters', reporterId, 'reporterId');
    }

    // ログインユーザーの場合は評価数を増やす
    if (req.isAuthenticated) {
      const userDoc = await db.collection('users').doc(req.userId).get();
      if (userDoc.exists) {
        await db.collection('users').doc(req.userId).update({
          totalRatings: (userDoc.data().totalRatings || 0) + 1,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: '評価を投稿しました',
      ratingId: ratingRef.id,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ratings/:articleId
 * 記事の評価一覧
 */
router.get('/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;

    const snapshot = await db
      .collection('ratings')
      .where('articleId', '==', articleId)
      .where('type', '==', 'article')
      .orderBy('createdAt', 'desc')
      .get();

    const ratings = [];
    snapshot.forEach(doc => {
      ratings.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({
      success: true,
      ratings: ratings,
      count: ratings.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ratings/reporter/:reporterId
 * 記者の評価一覧
 */
router.get('/reporter/:reporterId', async (req, res) => {
  try {
    const { reporterId } = req.params;

    const snapshot = await db
      .collection('ratings')
      .where('reporterId', '==', reporterId)
      .where('type', '==', 'reporter')
      .orderBy('createdAt', 'desc')
      .get();

    const ratings = [];
    snapshot.forEach(doc => {
      ratings.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({
      success: true,
      ratings: ratings,
      count: ratings.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/ratings/user/:userId
 * ユーザーが投稿した評価
 */
router.get('/user/:userId', verifyFirebaseToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const snapshot = await db
      .collection('ratings')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const ratings = [];
    snapshot.forEach(doc => {
      ratings.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({
      success: true,
      ratings: ratings,
      count: ratings.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
