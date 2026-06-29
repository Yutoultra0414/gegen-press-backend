/**
 * Reporters Routes
 * 記者エンドポイント
 */

const express = require('express');
const { db } = require('./firebase-config');
const { verifyTokenOptional, verifyFirebaseToken } = require('./middleware-auth');

const router = express.Router();

/**
 * GET /api/reporters
 * 記者一覧
 */
router.get('/', verifyTokenOptional, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const snapshot = await db
      .collection('reporters')
      .orderBy('trustScore', 'desc')
      .limit(parseInt(limit) + 1)
      .offset(skip)
      .get();

    const reporters = [];
    snapshot.forEach(doc => {
      reporters.push({ id: doc.id, ...doc.data() });
    });

    const hasMore = reporters.length > parseInt(limit);
    if (hasMore) reporters.pop();

    res.status(200).json({
      success: true,
      reporters: reporters,
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
 * GET /api/reporters/check-duplicate
 * 記者名の重複チェック（作成前の確認用）
 * 注意: /:id より先に定義する必要がある
 */
router.get('/check-duplicate', async (req, res) => {
  try {
    const { name } = req.query;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '記者名を指定してください',
      });
    }

    // 同名（前後の空白を無視・大文字小文字を無視）の記者を検索
    const normalized = name.trim().toLowerCase();
    const snapshot = await db.collection('reporters').get();

    const duplicates = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.name && data.name.trim().toLowerCase() === normalized) {
        duplicates.push({ id: doc.id, ...data });
      }
    });

    res.status(200).json({
      success: true,
      exists: duplicates.length > 0,
      duplicates: duplicates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/reporters
 * 記者を追加（ログイン必須）
 * Penmark の「授業を自分で追加」と同じく、ユーザーが記者を登録できる。
 * 追加された記者は全ユーザーで共有される。
 */
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { name, bio, profileImage, expertise, twitterHandle, mediaOutlet, allowDuplicate } = req.body;

    // バリデーション
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '記者名は必須です',
      });
    }

    // 重複チェック（allowDuplicate=true で明示的に許可された場合はスキップ）
    if (!allowDuplicate) {
      const normalized = name.trim().toLowerCase();
      const allReporters = await db.collection('reporters').get();
      const existing = [];
      allReporters.forEach(doc => {
        const data = doc.data();
        if (data.name && data.name.trim().toLowerCase() === normalized) {
          existing.push({ id: doc.id, ...data });
        }
      });

      if (existing.length > 0) {
        // 重複がある場合は作成せず、既存の記者を返す（409 Conflict）
        return res.status(409).json({
          success: false,
          message: '同名の記者が既に登録されています。既存の記者を使うか、それでも追加する場合は allowDuplicate を指定してください',
          duplicates: existing,
        });
      }
    }

    // 記者を作成
    const reporterRef = await db.collection('reporters').add({
      name: name.trim(),
      bio: bio || '',
      profileImage: profileImage || null,
      expertise: expertise || [],
      twitterHandle: twitterHandle || null,
      mediaOutlet: mediaOutlet || null,
      trustScore: 0,        // 未評価（評価が集まると自動算出される）
      articlesCount: 0,
      averageRating: 0,
      followers: 0,
      isVerified: false,    // ユーザー追加なので未認証。運営が認証するとtrueに
      createdBy: req.userId, // 追加したユーザーのUID
      source: 'user',        // 'user' = ユーザー追加 / 'official' = 運営登録
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const newReporter = await reporterRef.get();

    res.status(201).json({
      success: true,
      message: '記者を追加しました',
      reporter: { id: reporterRef.id, ...newReporter.data() },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/reporters/ranking
 * 記者ランキング（信ぴょう性スコア順）
 * 注意: /:id より先に定義する必要がある
 */
router.get('/ranking', async (req, res) => {
  try {
    const { period = 'all', limit = 50 } = req.query;

    const snapshot = await db
      .collection('reporters')
      .orderBy('trustScore', 'desc')
      .limit(parseInt(limit))
      .get();

    const ranking = [];
    let rank = 1;
    snapshot.forEach(doc => {
      ranking.push({
        rank: rank++,
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({
      success: true,
      ranking: ranking,
      period: period,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/reporters/:id
 * 記者詳細
 */
router.get('/:id', verifyTokenOptional, async (req, res) => {
  try {
    const { id } = req.params;

    const reporterDoc = await db.collection('reporters').doc(id).get();

    if (!reporterDoc.exists) {
      return res.status(404).json({
        success: false,
        message: '記者が見つかりません',
      });
    }

    res.status(200).json({
      success: true,
      reporter: { id: reporterDoc.id, ...reporterDoc.data() },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/reporters/:id
 * 記者情報を編集（ログイン必須）
 * 追加した本人のみ編集可能。trustScore等の集計値は変更不可。
 */
router.put('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, bio, profileImage, expertise, twitterHandle, mediaOutlet } = req.body;

    const reporterDoc = await db.collection('reporters').doc(id).get();

    if (!reporterDoc.exists) {
      return res.status(404).json({
        success: false,
        message: '記者が見つかりません',
      });
    }

    const reporterData = reporterDoc.data();

    // 権限チェック: 追加した本人のみ編集可能
    // （運営登録の記者 source='official' はここでは編集不可）
    if (reporterData.createdBy !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'この記者情報を編集する権限がありません（追加した本人のみ編集できます）',
      });
    }

    // 編集可能なフィールドのみ更新（trustScoreなどの集計値は対象外）
    const updateData = { updatedAt: new Date() };
    if (name !== undefined && name.trim() !== '') updateData.name = name.trim();
    if (bio !== undefined) updateData.bio = bio;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (expertise !== undefined) updateData.expertise = expertise;
    if (twitterHandle !== undefined) updateData.twitterHandle = twitterHandle;
    if (mediaOutlet !== undefined) updateData.mediaOutlet = mediaOutlet;

    await db.collection('reporters').doc(id).update(updateData);

    res.status(200).json({
      success: true,
      message: '記者情報を更新しました',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/reporters/:id/articles
 * 記者の記事一覧
 */
router.get('/:id/articles', verifyTokenOptional, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const snapshot = await db
      .collection('articles')
      .where('authorId', '==', id)
      .where('isPublished', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit) + 1)
      .offset(skip)
      .get();

    const articles = [];
    snapshot.forEach(doc => {
      articles.push({ id: doc.id, ...doc.data() });
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
 * GET /api/reporters/:id/reviews
 * 記者のレビュー一覧
 */
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;

    const snapshot = await db
      .collection('ratings')
      .where('reporterId', '==', id)
      .where('type', '==', 'reporter')
      .orderBy('createdAt', 'desc')
      .get();

    const reviews = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // コメントがある評価のみをレビューとして表示
      if (data.comment && data.comment.trim() !== '') {
        reviews.push({ id: doc.id, ...data });
      }
    });

    res.status(200).json({
      success: true,
      reviews: reviews,
      count: reviews.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
