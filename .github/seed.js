/**
 * Firestore シードスクリプト
 * Gegen Press! - 記者・記事のダミーデータを投入します
 *
 * 使い方:
 *   1. .env に Firebase の値を設定済みであること
 *   2. node seed.js
 *
 * 記者IDは固定値（rep_xxx）にしてあるので、フロントのリンクから
 * ?id=rep_fabrizio のように安定して参照できます。
 * 何度実行しても同じIDで上書き（set）されるため重複しません。
 */

const { db } = require('./firebase-config');

// ---------- 記者データ（IDは固定） ----------
const reporters = [
  {
    id: 'rep_fabrizio',
    name: 'Fabrizio Romano',
    mediaOutlet: '移籍情報スペシャリスト',
    bio: '世界中の移籍情報をいち早く届ける、移籍報道の第一人者。',
    expertise: ['移籍情報', 'プレミアリーグ', 'セリエA'],
    twitterHandle: '@FabrizioRomano',
    trustScore: 96,
    articlesCount: 284,
    averageRating: 4.8,
    followers: 1200000,
    isVerified: true,
  },
  {
    id: 'rep_skysports',
    name: 'Sky Sports',
    mediaOutlet: 'プレミアリーグ専門',
    bio: 'プレミアリーグを中心に、確かな取材力で速報を届ける。',
    expertise: ['プレミアリーグ', '代表チーム'],
    twitterHandle: '@SkySportsNews',
    trustScore: 92,
    articlesCount: 512,
    averageRating: 4.6,
    followers: 980000,
    isVerified: true,
  },
  {
    id: 'rep_marca',
    name: 'Marca Sports',
    mediaOutlet: 'スペイン情報',
    bio: 'スペインサッカーの総本山。ラリーガの最新動向に強い。',
    expertise: ['ラリーガ', '移籍情報'],
    twitterHandle: '@marca',
    trustScore: 88,
    articlesCount: 430,
    averageRating: 4.4,
    followers: 760000,
    isVerified: true,
  },
  {
    id: 'rep_goal',
    name: 'Goal.com',
    mediaOutlet: 'ヨーロッパ全域対応',
    bio: '欧州各国リーグを幅広くカバーする総合サッカーメディア。',
    expertise: ['プレミアリーグ', 'ラリーガ', 'セリエA', 'ブンデスリーガ'],
    twitterHandle: '@goal',
    trustScore: 81,
    articlesCount: 645,
    averageRating: 4.1,
    followers: 540000,
    isVerified: true,
  },
  {
    id: 'rep_as',
    name: 'AS España',
    mediaOutlet: 'ラリーガ・スペイン',
    bio: 'レアル・マドリーやバルセロナの一次情報に定評。',
    expertise: ['ラリーガ', '代表チーム'],
    twitterHandle: '@diarioas',
    trustScore: 85,
    articlesCount: 388,
    averageRating: 4.3,
    followers: 620000,
    isVerified: true,
  },
  {
    id: 'rep_calcio',
    name: 'Calcio & Calcetti',
    mediaOutlet: 'セリエA専門',
    bio: 'イタリアンフットボールの専門家。セリエAの動向に精通。',
    expertise: ['セリエA'],
    twitterHandle: '@calciomercato',
    trustScore: 78,
    articlesCount: 167,
    averageRating: 4.2,
    followers: 210000,
    isVerified: false,
  },
];

// ---------- 記事データ（authorId は上の記者IDを参照） ----------
const articles = [
  {
    id: 'art_001',
    title: 'マンチェスター・シティが超大型補強を発表',
    authorId: 'rep_fabrizio',
    category: '移籍情報',
    description: 'プレミアリーグの雄、マンチェスター・シティが2024-25シーズンに向けた大規模な補強計画を発表しました。',
    content: 'プレミアリーグの雄、マンチェスター・シティが2024-25シーズンに向けた大規模な補強計画を発表しました。複数の欧州トップリーグの有力選手が加入予定となっており、来季のさらなる戦力強化が期待されます。',
    tags: ['マンチェスター・シティ', '補強', 'プレミアリーグ'],
    views: 2450, likes: 320, commentsCount: 156, averageRating: 4.8, trustScore: 96,
  },
  {
    id: 'art_002',
    title: 'ユナイテッド、レアル・マドリーのスター選手を獲得か',
    authorId: 'rep_fabrizio',
    category: '移籍情報',
    description: 'マンチェスター・ユナイテッドが、レアル・マドリーのスター選手との契約交渉に進むという最新情報。',
    content: 'マンチェスター・ユナイテッドが、レアル・マドリーのスター選手との契約交渉に進むという最新情報が入ってきました。複数のソースから確認されています。',
    tags: ['マンチェスター・ユナイテッド', 'レアル・マドリー', '移籍'],
    views: 1892, likes: 240, commentsCount: 98, averageRating: 4.7, trustScore: 94,
  },
  {
    id: 'art_003',
    title: 'PSG、フランス代表MFの争奪戦に勝利',
    authorId: 'rep_fabrizio',
    category: '移籍情報',
    description: 'パリ・サンジェルマンが、フランス代表の有望なMFの獲得に成功しました。',
    content: 'パリ・サンジェルマンが、フランス代表の有望なMFの獲得に成功しました。複数のビッグクラブからのオファーを制しての獲得となります。',
    tags: ['PSG', 'リーグアン', '移籍'],
    views: 3267, likes: 410, commentsCount: 203, averageRating: 4.9, trustScore: 95,
  },
  {
    id: 'art_004',
    title: 'レアル・マドリー、日本の若き才能に興味',
    authorId: 'rep_marca',
    category: 'ラリーガ',
    description: 'レアル・マドリーが日本人の若手選手に注目しているとの報道。',
    content: 'レアル・マドリーが日本人の若手選手に注目しているとの報道がありました。今後の移籍市場での動きが注目されます。',
    tags: ['レアル・マドリー', '日本', 'ラリーガ'],
    views: 856, likes: 130, commentsCount: 54, averageRating: 4.5, trustScore: 88,
  },
  {
    id: 'art_005',
    title: 'シティとユナイテッド、プレミア優勝争いは接戦へ',
    authorId: 'rep_skysports',
    category: 'プレミアリーグ',
    description: 'プレミアリーグの優勝争いが今季も激しさを増しています。',
    content: 'プレミアリーグの優勝争いが今季も激しさを増しています。マンチェスターの2クラブを中心に、目が離せない展開が続いています。',
    tags: ['プレミアリーグ', '優勝争い'],
    views: 3120, likes: 380, commentsCount: 167, averageRating: 4.6, trustScore: 92,
  },
  {
    id: 'art_006',
    title: 'ユベントス、イタリア代表CBを獲得',
    authorId: 'rep_calcio',
    category: 'セリエA',
    description: 'ユベントスが、イタリア代表の主力ディフェンダーの獲得を発表。',
    content: 'ユベントスが、イタリア代表の主力ディフェンダーの獲得を発表。セリエAの最強ディフェンス構築に向けた重要な一手となります。',
    tags: ['ユベントス', 'セリエA', '移籍'],
    views: 2145, likes: 210, commentsCount: 88, averageRating: 4.5, trustScore: 85,
  },
];

// ---------- 投入処理 ----------
async function seed() {
  console.log('========================================');
  console.log('  Gegen Press! Firestore シード開始');
  console.log('========================================');

  const now = new Date();

  // 記者を投入
  console.log('\n[1/2] 記者データを投入中...');
  for (const r of reporters) {
    const { id, ...data } = r;
    await db.collection('reporters').doc(id).set({
      ...data,
      profileImage: null,
      createdBy: null,    // 運営登録
      source: 'official',
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  ✓ ${r.name} (${id})`);
  }

  // 記事を投入
  console.log('\n[2/2] 記事データを投入中...');
  for (const a of articles) {
    const { id, authorId, ...data } = a;
    const reporter = reporters.find(r => r.id === authorId);
    await db.collection('articles').doc(id).set({
      ...data,
      authorId: authorId,
      authorName: reporter ? reporter.name : '不明',
      authorScore: reporter ? reporter.trustScore : 80,
      image: null,
      isPublished: true,
      updatedAt: now,
      createdAt: now,
    });
    console.log(`  ✓ ${a.title} (${id})`);
  }

  console.log('\n========================================');
  console.log(`  完了: 記者 ${reporters.length}件 / 記事 ${articles.length}件`);
  console.log('========================================');
  process.exit(0);
}

seed().catch(err => {
  console.error('シード中にエラーが発生しました:', err);
  process.exit(1);
});
