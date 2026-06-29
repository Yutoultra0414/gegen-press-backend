/**
 * Users Routes
 * ユーザーエンドポイント
 */

const express = require('express');
const { db } = require('./firebase-config');
const { verifyFirebaseToken, verifyTokenOptional } = require('./middleware-auth');

const router = express.Router();

/**
 * GET /api/users/:id
 * ユーザー情報取得
 */
router.get('/:id', verifyTokenOptional, async (req, res) => {
  try {
    const { id } = req.params;

    const userDoc = await db.collection('users').doc(id).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'ユーザーが見つかりません',
      });
    }

    const userData = userDoc.data();
    // メールアドレスなど機密情報は除外（本人以外）
    if (!req.isAuthenticated || req.userId !== id) {
      delete userData.email;
      delete userData.preferences;
    }

    res.status(200).json({
      success: true,
      user: userData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/users/:id
 * ユーザー情報更新（本人のみ）
 */
router.put('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 権限チェック
    if (req.userId !== id) {
      return res.status(403).json({
        success: false,
        message: '他のユーザーの情報を編集する権限がありません',
      });
    }

    const { username, bio, profileImage, preferences } = req.body;

    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'ユーザーが見つかりません',
      });
    }

    const updateData = { updatedAt: new Date() };
    if (username !== undefined) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (preferences !== undefined) updateData.preferences = preferences;

    await db.collection('users').doc(id).update(updateData);

    res.status(200).json({
      success: true,
      message: 'ユーザー情報を更新しました',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/users/:id/profile
 * ユーザープロフィール（評価・統計込み）
 */
router.get('/:id/profile', verifyTokenOptional, async (req, res) => {
  try {
    const { id } = req.params;

    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'ユーザーが見つかりません',
      });
    }

    // ユーザーの評価を取得
    const ratingsSnapshot = await db
      .collection('ratings')
      .where('userId', '==', id)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const ratings = [];
    ratingsSnapshot.forEach(doc => {
      ratings.push({ id: doc.id, ...doc.data() });
    });

    const userData = userDoc.data();
    if (!req.isAuthenticated || req.userId !== id) {
      delete userData.email;
      delete userData.preferences;
    }

    res.status(200).json({
      success: true,
      user: userData,
      recentRatings: ratings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/users/:id/follow
 * ユーザー/記者をフォロー
 */
router.post('/:id/follow', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params; // フォロー対象

    if (req.userId === id) {
      return res.status(400).json({
        success: false,
        message: '自分自身をフォローすることはできません',
      });
    }

    // フォロー対象のフォロワー数を増やす
    const targetDoc = await db.collection('users').doc(id).get();
    if (targetDoc.exists) {
      await db.collection('users').doc(id).update({
        followers: (targetDoc.data().followers || 0) + 1,
      });
    }

    // 自分のフォロー中の数を増やす
    const myDoc = await db.collection('users').doc(req.userId).get();
    await db.collection('users').doc(req.userId).update({
      following: (myDoc.data().following || 0) + 1,
    });

    // フォロー関係を記録
    await db.collection('follows').add({
      followerId: req.userId,
      followingId: id,
      createdAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'フォローしました',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/users/:id/follow
 * フォロー解除
 */
router.delete('/:id/follow', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;

    // フォロー関係を検索して削除
    const followSnapshot = await db
      .collection('follows')
      .where('followerId', '==', req.userId)
      .where('followingId', '==', id)
      .get();

    if (followSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'フォロー関係が見つかりません',
      });
    }

    followSnapshot.forEach(async doc => {
      await db.collection('follows').doc(doc.id).delete();
    });

    // フォロワー数を減らす
    const targetDoc = await db.collection('users').doc(id).get();
    if (targetDoc.exists) {
      await db.collection('users').doc(id).update({
        followers: Math.max((targetDoc.data().followers || 1) - 1, 0),
      });
    }

    // 自分のフォロー中の数を減らす
    const myDoc = await db.collection('users').doc(req.userId).get();
    await db.collection('users').doc(req.userId).update({
      following: Math.max((myDoc.data().following || 1) - 1, 0),
    });

    res.status(200).json({
      success: true,
      message: 'フォローを解除しました',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/users/:id/bookmarks
 * ブックマーク一覧
 */
router.get('/:id/bookmarks', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.userId !== id) {
      return res.status(403).json({
        success: false,
        message: '他のユーザーのブックマークを閲覧する権限がありません',
      });
    }

    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'ユーザーが見つかりません',
      });
    }

    const savedArticleIds = userDoc.data().savedArticles || [];
    const articles = [];

    // ブックマークした記事を取得
    for (const articleId of savedArticleIds) {
      const articleDoc = await db.collection('articles').doc(articleId).get();
      if (articleDoc.exists) {
        articles.push({ id: articleDoc.id, ...articleDoc.data() });
      }
    }

    res.status(200).json({
      success: true,
      bookmarks: articles,
      count: articles.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/users/:id/bookmarks
 * ブックマーク追加
 */
router.post('/:id/bookmarks', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { articleId } = req.body;

    if (req.userId !== id) {
      return res.status(403).json({
        success: false,
        message: '権限がありません',
      });
    }

    if (!articleId) {
      return res.status(400).json({
        success: false,
        message: '記事IDは必須です',
      });
    }

    const userDoc = await db.collection('users').doc(id).get();
    const savedArticles = userDoc.data().savedArticles || [];

    if (savedArticles.includes(articleId)) {
      return res.status(400).json({
        success: false,
        message: '既にブックマーク済みです',
      });
    }

    savedArticles.push(articleId);
    await db.collection('users').doc(id).update({
      savedArticles: savedArticles,
    });

    res.status(200).json({
      success: true,
      message: 'ブックマークに追加しました',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/users/:id/bookmarks/:articleId
 * ブックマーク削除
 */
router.delete('/:id/bookmarks/:articleId', verifyFirebaseToken, async (req, res) => {
  try {
    const { id, articleId } = req.params;

    if (req.userId !== id) {
      return res.status(403).json({
        success: false,
        message: '権限がありません',
      });
    }

    const userDoc = await db.collection('users').doc(id).get();
    let savedArticles = userDoc.data().savedArticles || [];

    savedArticles = savedArticles.filter(aid => aid !== articleId);
    await db.collection('users').doc(id).update({
      savedArticles: savedArticles,
    });

    res.status(200).json({
      success: true,
      message: 'ブックマークを削除しました',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
