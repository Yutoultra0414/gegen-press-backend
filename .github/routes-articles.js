/**
 * Articles Routes
 * 記事エンドポイント
 */

const express = require('express');
const { db } = require('./firebase-config');
const { verifyFirebaseToken, verifyTokenOptional } = require('./middleware-auth');

const router = express.Router();

/**
 * GET /api/articles
 * 記事一覧取得
 */
router.get('/', verifyTokenOptional, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, sortBy = 'createdAt' } = req.query;
    const skip = (page - 1) * limit;

    let query = db.collection('articles').where('isPublished', '==', true);

    // カテゴリフィルター
    if (category) {
      query = query.where('category', '==', category);
    }

    // ソート
    if (sortBy === 'views') {
      query = query.orderBy('views', 'desc');
    } else if (sortBy === 'rating') {
      query = query.orderBy('averageRating', 'desc');
    } else {
      query = query.orderBy('createdAt', 'desc');
    }

    // ページネーション
    const snapshot = await query.limit(parseInt(limit) + 1).offset(skip).get();

    const articles = [];
    snapshot.forEach(doc => {
      articles.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    const hasMore = articles.length > parseInt(limit);
    if (hasMore) articles.pop();

    res.status(200).json({
      success: true,
      articles: articles,
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
 * GET /api/articles/:id
 * 記事詳細取得
 */
router.get('/:id', verifyTokenOptional, async (req, res) => {
  try {
    const { id } = req.params;

    const articleDoc = await db.collection('articles').doc(id).get();

    if (!articleDoc.exists) {
      return res.status(404).json({
        success: false,
        message: '記事が見つかりません',
      });
    }

    const article = {
      id: articleDoc.id,
      ...articleDoc.data(),
    };

    // 閲覧数を増やす
    await db.collection('articles').doc(id).update({
      views: (article.views || 0) + 1,
    });

    res.status(200).json({
      success: true,
      article: article,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/articles
 * 記事作成（記者のみ）
 */
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { title, content, description, category, tags, image } = req.body;

    // バリデーション
    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        message: 'タイトル、内容、カテゴリは必須です',
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

    // 新規記事を作成
    const articleRef = await db.collection('articles').add({
      title: title,
      content: content,
      description: description || content.substring(0, 100),
      authorId: req.userId,
      authorName: userDoc.data().username,
      authorScore: 80, // デフォルト値
      category: category,
      tags: tags || [],
      image: image || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      views: 0,
      likes: 0,
      commentsCount: 0,
      averageRating: 0,
      trustScore: 80,
      isPublished: true,
    });

    res.status(201).json({
      success: true,
      message: '記事を作成しました',
      articleId: articleRef.id,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/articles/:id
 * 記事更新（記者のみ）
 */
router.put('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, description, category, tags, image } = req.body;

    const articleDoc = await db.collection('articles').doc(id).get();

    if (!articleDoc.exists) {
      return res.status(404).json({
        success: false,
        message: '記事が見つかりません',
      });
    }

    // 権限チェック
    if (articleDoc.data().authorId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'この記事を編集する権限がありません',
      });
    }

    // 記事を更新
    await db.collection('articles').doc(id).update({
      title: title || articleDoc.data().title,
      content: content || articleDoc.data().content,
      description: description || articleDoc.data().description,
      category: category || articleDoc.data().category,
      tags: tags || articleDoc.data().tags,
      image: image !== undefined ? image : articleDoc.data().image,
      updatedAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: '記事を更新しました',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/articles/:id
 * 記事削除（記者のみ）
 */
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;

    const articleDoc = await db.collection('articles').doc(id).get();

    if (!articleDoc.exists) {
      return res.status(404).json({
        success: false,
        message: '記事が見つかりません',
      });
    }

    // 権限チェック
    if (articleDoc.data().authorId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'この記事を削除する権限がありません',
      });
    }

    // 記事を削除
    await db.collection('articles').doc(id).delete();

    res.status(200).json({
      success: true,
      message: '記事を削除しました',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/articles/category/:category
 * カテゴリ別記事取得
 */
router.get('/category/:category', verifyTokenOptional, async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const snapshot = await db
      .collection('articles')
      .where('category', '==', category)
      .where('isPublished', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit) + 1)
      .offset(skip)
      .get();

    const articles = [];
    snapshot.forEach(doc => {
      articles.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    const hasMore = articles.length > parseInt(limit);
    if (hasMore) articles.pop();

    res.status(200).json({
      success: true,
      articles: articles,
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
 * GET /api/articles/search
 * 記事検索
 */
router.get('/search', verifyTokenOptional, async (req, res) => {
  try {
    const { q, category, page = 1, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: '検索キーワードを指定してください',
      });
    }

    // 簡易的な検索（Firestore の Text Search 相当）
    let query = db.collection('articles').where('isPublished', '==', true);

    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();

    const articles = [];
    snapshot.forEach(doc => {
      const article = doc.data();
      // タイトルまたはコンテンツに検索キーワードが含まれているかチェック
      if (
        article.title.toLowerCase().includes(q.toLowerCase()) ||
        article.description.toLowerCase().includes(q.toLowerCase())
      ) {
        articles.push({
          id: doc.id,
          ...article,
        });
      }
    });

    // ページネーション
    const skip = (page - 1) * limit;
    const paginatedArticles = articles.slice(skip, skip + parseInt(limit));
    const hasMore = articles.length > skip + parseInt(limit);

    res.status(200).json({
      success: true,
      articles: paginatedArticles,
      totalResults: articles.length,
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

module.exports = router;
