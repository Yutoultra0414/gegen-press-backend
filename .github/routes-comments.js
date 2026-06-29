/**
 * Comments Routes
 * コメントエンドポイント
 */

const express = require('express');
const { db } = require('./firebase-config');
const { verifyFirebaseToken, verifyTokenOptional } = require('./middleware-auth');

const router = express.Router();

/**
 * GET /api/comments/:articleId
 * 記事コメント一覧取得
 */
router.get('/:articleId', verifyTokenOptional, async (req, res) => {
  try {
    const { articleId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const snapshot = await db
      .collection('comments')
      .where('articleId', '==', articleId)
      .where('isApproved', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit) + 1)
      .offset(skip)
      .get();

    const comments = [];
    snapshot.forEach(doc => {
      comments.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    const hasMore = comments.length > parseInt(limit);
    if (hasMore) comments.pop();

    res.status(200).json({
      success: true,
      comments: comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: hasMore,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/comments
 * コメント投稿
 */
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { articleId, content, rating } = req.body;

    // バリデーション
    if (!articleId || !content) {
      return res.status(400).json({
        success: false,
        message: '記事IDとコンテンツは必須です',
      });
    }

    // ユーザー情報を取得
    const userDoc = await db.collection('users').doc(req.userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'ユーザーが見つかりません',
      });
    }

    // コメントを作成
    const commentRef = await db.collection('comments').add({
      articleId: articleId,
      userId: req.userId,
      username: userDoc.data().username,
      userProfileImage: userDoc.data().profileImage,
      content: content,
      rating: rating || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: 0,
      replies: [],
      isApproved: true, // デフォルトで承認
    });

    // 記事のコメント数を増やす
    const articleDoc = await db.collection('articles').doc(articleId).get();
    if (articleDoc.exists) {
      await db.collection('articles').doc(articleId).update({
        commentsCount: (articleDoc.data().commentsCount || 0) + 1,
      });
    }

    res.status(201).json({
      success: true,
      message: 'コメントを投稿しました',
      commentId: commentRef.id,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/comments/:id
 * コメント編集
 */
router.put('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const commentDoc = await db.collection('comments').doc(id).get();

    if (!commentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'コメントが見つかりません',
      });
    }

    // 権限チェック
    if (commentDoc.data().userId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'このコメントを編集する権限がありません',
      });
    }

    // コメントを更新
    await db.collection('comments').doc(id).update({
      content: content || commentDoc.data().content,
      updatedAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'コメントを更新しました',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/comments/:id
 * コメント削除
 */
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;

    const commentDoc = await db.collection('comments').doc(id).get();

    if (!commentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'コメントが見つかりません',
      });
    }

    // 権限チェック
    if (commentDoc.data().userId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'このコメントを削除する権限がありません',
      });
    }

    // コメント数を減らす
    const articleId = commentDoc.data().articleId;
    const articleDoc = await db.collection('articles').doc(articleId).get();
    if (articleDoc.exists) {
      await db.collection('articles').doc(articleId).update({
        commentsCount: Math.max((articleDoc.data().commentsCount || 1) - 1, 0),
      });
    }

    // コメントを削除
    await db.collection('comments').doc(id).delete();

    res.status(200).json({
      success: true,
      message: 'コメントを削除しました',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
