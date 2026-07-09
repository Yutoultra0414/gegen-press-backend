/**
 * Gegen Press! API クライアント（Firestore 直結版 / サーバー不要）
 *
 * これまでは「バックエンドサーバー」に fetch していましたが、
 * この版ではブラウザから直接 Firebase(Firestore + Authentication) に
 * 読み書きします。呼び出し方（GegenPressAPI.reporters.xxx など）は
 * これまでと同じなので、HTML 側は基本そのままで動きます。
 *
 * 使い方: <script src="api-client.js"></script>
 */
(function () {
  // ==== Firebase 設定（Web公開前提の値。秘密鍵ではありません） ====
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDyisueW3srtm60_Y1oiE4mf5Rcy6_gB6Y",
    authDomain: "gegen-press.firebaseapp.com",
    projectId: "gegen-press",
    storageBucket: "gegen-press.firebasestorage.app",
    messagingSenderId: "304267410037",
    appId: "1:304267410037:web:d6871a28db9b9fc397d63c"
  };

  const SDK_VERSION = "10.7.0";
  const CDN = "https://www.gstatic.com/firebasejs/" + SDK_VERSION + "/";

  // ==== SDK を必要に応じて読み込む ====
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var already = Array.prototype.some.call(document.scripts, function (s) {
        return s.src && s.src.indexOf(src) >= 0;
      });
      if (already) return resolve();
      var el = document.createElement('script');
      el.src = src;
      el.async = false;
      el.onload = function () { resolve(); };
      el.onerror = function () { reject(new Error('SDK読み込み失敗: ' + src)); };
      document.head.appendChild(el);
    });
  }

  async function ensureFirebase() {
    if (typeof firebase === 'undefined') {
      await loadScript(CDN + 'firebase-app-compat.js');
    }
    if (!firebase.auth) {
      await loadScript(CDN + 'firebase-auth-compat.js');
    }
    if (!firebase.firestore) {
      await loadScript(CDN + 'firebase-firestore-compat.js');
    }
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    return { db: firebase.firestore(), auth: firebase.auth() };
  }

  var _ready = ensureFirebase().then(async function (fb) {
    // Googleログインが signInWithRedirect にフォールバックした場合、
    // リダイレクトで戻ってきた直後にその結果を回収して users コレクションに反映する
    try {
      var redirectResult = await fb.auth.getRedirectResult();
      if (redirectResult && redirectResult.user) {
        await fb.db.collection('users').doc(redirectResult.user.uid).set({
          username: redirectResult.user.displayName || '',
          email: redirectResult.user.email || '',
          updatedAt: tsNow()
        }, { merge: true });
      }
    } catch (e) {
      console.warn('リダイレクトログインの結果取得に失敗しました:', e);
    }
    return fb;
  }).catch(function (e) {
    console.error('Firebase 初期化に失敗しました:', e);
    throw e;
  });

  // ログイン状態が確定するのを一度だけ待つ
  function currentUser() {
    return _ready.then(function (fb) {
      if (fb.auth.currentUser) return fb.auth.currentUser;
      return new Promise(function (resolve) {
        var un = fb.auth.onAuthStateChanged(function (u) { un(); resolve(u); });
      });
    });
  }

  // 認証エラーを日本語に
  function authMsg(e) {
    var c = (e && e.code) || '';
    if (c.indexOf('email-already-in-use') >= 0) return 'このメールアドレスは既に登録されています';
    if (c.indexOf('invalid-email') >= 0) return 'メールアドレスの形式が正しくありません';
    if (c.indexOf('weak-password') >= 0) return 'パスワードは6文字以上にしてください';
    if (c.indexOf('wrong-password') >= 0 || c.indexOf('user-not-found') >= 0 || c.indexOf('invalid-credential') >= 0)
      return 'メールアドレスまたはパスワードが違います';
    if (c.indexOf('too-many-requests') >= 0) return '試行回数が多すぎます。しばらくしてからお試しください';
    if (c.indexOf('popup-closed') >= 0) return 'ログイン画面が閉じられました';
    return (e && e.message) || 'エラーが発生しました';
  }

  function docList(snap) {
    return snap.docs.map(function (d) {
      var data = d.data();
      data.id = d.id;
      return data;
    });
  }
  function tsNow() { return firebase.firestore.FieldValue.serverTimestamp(); }

  var GegenPressAPI = {
    _token: null,
    setToken: function (t) { this._token = t; },
    getToken: function () { return this._token; },
    ready: function () { return _ready; },
    // seedページなどが直接使えるように
    _db: function () { return _ready.then(function (fb) { return fb.db; }); },
    _currentUser: currentUser,

    // ===== 管理者 =====
    // 管理者を増やしたい場合は、ここに UID を追加するだけでOK。
    // （Firestoreのセキュリティルール側は別途、同じUIDを追記してデプロイする必要があります）
    ADMIN_UIDS: ['EcFjXMp6rpODK9i8E1DN1CPjZov2', 'DKjQNLTtVldXTMEXFQ1TJiOaxNE2'],
    isAdminUid: function (uid) {
      return !!uid && this.ADMIN_UIDS.indexOf(uid) !== -1;
    },

    // ===== 認証 =====
    auth: {
      async signup(email, password, username) {
        try {
          var fb = await _ready;
          var cred = await fb.auth.createUserWithEmailAndPassword(email, password);
          var uid = cred.user.uid;
          if (username) { try { await cred.user.updateProfile({ displayName: username }); } catch (e) {} }
          await fb.db.collection('users').doc(uid).set({
            username: username || '', email: email,
            followingReporters: [], bookmarks: [],
            createdAt: tsNow(), updatedAt: tsNow()
          }, { merge: true });
          var token = await cred.user.getIdToken();
          return { success: true, uid: uid, token: token };
        } catch (e) { return { success: false, message: authMsg(e) }; }
      },
      async login(email, password) {
        try {
          var fb = await _ready;
          var cred = await fb.auth.signInWithEmailAndPassword(email, password);
          var token = await cred.user.getIdToken();
          return { success: true, uid: cred.user.uid, token: token };
        } catch (e) { return { success: false, message: authMsg(e) }; }
      },
      async loginWithGoogle() {
        try {
          var fb = await _ready;
          var provider = new firebase.auth.GoogleAuthProvider();
          var cred;
          try {
            cred = await fb.auth.signInWithPopup(provider);
          } catch (popupErr) {
            var c = (popupErr && popupErr.code) || '';
            // ポップアップがブロックされる/開けない環境（Edgeなど一部ブラウザの
            // トラッキング防止設定やサードパーティCookieブロックで起きやすい）では
            // リダイレクト方式に切り替える。リダイレクト後はページが再読み込みされ、
            // 初期化時の getRedirectResult() でログイン状態が反映される。
            if (c.indexOf('popup-blocked') >= 0 || c.indexOf('popup-closed-by-user') >= 0 ||
                c.indexOf('cancelled-popup-request') >= 0 || c.indexOf('operation-not-supported') >= 0) {
              await fb.auth.signInWithRedirect(provider);
              return { success: true, redirecting: true };
            }
            throw popupErr;
          }
          var uid = cred.user.uid;
          await fb.db.collection('users').doc(uid).set({
            username: cred.user.displayName || '', email: cred.user.email || '',
            updatedAt: tsNow()
          }, { merge: true });
          var token = await cred.user.getIdToken();
          return { success: true, uid: uid, token: token };
        } catch (e) { return { success: false, message: authMsg(e) }; }
      },
      async logout() {
        try { var fb = await _ready; await fb.auth.signOut(); return { success: true }; }
        catch (e) { return { success: false, message: String(e) }; }
      },
      async resetPassword(email) {
        try { var fb = await _ready; await fb.auth.sendPasswordResetEmail(email); return { success: true }; }
        catch (e) { return { success: false, message: authMsg(e) }; }
      },
      async verify() {
        var u = await currentUser();
        return u ? { success: true, uid: u.uid } : { success: false };
      }
    },

    // ===== 記者 =====
    reporters: {
      async getAll(params) {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('reporters').get();
          var list = docList(snap);
          return { success: true, reporters: list, count: list.length };
        } catch (e) { return { success: false, message: String(e), reporters: [] }; }
      },
      async getById(id) {
        try {
          var fb = await _ready;
          var doc = await fb.db.collection('reporters').doc(id).get();
          if (!doc.exists) return { success: false, message: '記者が見つかりません' };
          var data = doc.data(); data.id = doc.id;
          return { success: true, reporter: data };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async getRanking(params) {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('reporters').get();
          var list = docList(snap);
          list.sort(function (a, b) { return (b.trustScore || 0) - (a.trustScore || 0); });
          list = list.map(function (r, i) { r.rank = i + 1; return r; });
          return { success: true, ranking: list };
        } catch (e) { return { success: false, message: String(e), ranking: [] }; }
      },
      async getArticles(id, params) {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('articles').where('authorId', '==', id).get();
          return { success: true, articles: docList(snap) };
        } catch (e) { return { success: false, message: String(e), articles: [] }; }
      },
      async getReviews(id) {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('reviews').where('reporterId', '==', id).get();
          return { success: true, reviews: docList(snap) };
        } catch (e) { return { success: true, reviews: [] }; }
      },
      async checkDuplicate(name) {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('reporters').get();
          var lower = (name || '').trim().toLowerCase();
          var dups = docList(snap).filter(function (r) {
            return (r.name || '').trim().toLowerCase() === lower;
          });
          return { success: true, exists: dups.length > 0, duplicates: dups };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async create(data) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: '記者の追加にはログインが必要です' };
          var fb = await _ready;
          if (!data.allowDuplicate) {
            var dup = await this.checkDuplicate(data.name);
            if (dup.success && dup.exists) {
              return { success: false, duplicates: dup.duplicates, message: '同名の記者が既に登録されています' };
            }
          }
          var docData = {
            name: data.name,
            nameRomaji: data.nameRomaji || null,
            reporterType: data.reporterType || null,
            beatClub: data.beatClub || null,
            mediaOutlet: data.mediaOutlet || null,
            twitterHandle: data.twitterHandle || null,
            expertise: data.expertise || [],
            bio: data.bio || '',
            profileImage: null,
            trustScore: 0, articlesCount: 0, averageRating: 0, followers: 0,
            isVerified: false,
            createdBy: u.uid,
            source: 'user',
            createdAt: tsNow(), updatedAt: tsNow()
          };
          var ref = await fb.db.collection('reporters').add(docData);
          docData.id = ref.id;
          return { success: true, reporter: docData };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async update(id, data) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: 'ログインが必要です' };
          var fb = await _ready;
          var patch = {};
          Object.keys(data || {}).forEach(function (k) {
            if (k !== 'allowDuplicate') patch[k] = data[k];
          });
          patch.updatedAt = tsNow();
          await fb.db.collection('reporters').doc(id).update(patch);
          return { success: true };
        } catch (e) { return { success: false, message: String(e) }; }
      }
    },

    // ===== 選手 =====
    players: {
      async getAll(params) {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('players').get();
          var list = docList(snap);
          return { success: true, players: list, count: list.length };
        } catch (e) { return { success: false, message: String(e), players: [] }; }
      },
      async getById(id) {
        try {
          var fb = await _ready;
          var doc = await fb.db.collection('players').doc(id).get();
          if (!doc.exists) return { success: false, message: '選手が見つかりません' };
          var data = doc.data(); data.id = doc.id;
          return { success: true, player: data };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async checkDuplicate(name, wikidataId) {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('players').get();
          var lower = (name || '').trim().toLowerCase();
          var all = docList(snap);
          // 名前の完全一致に加え、wikidataId が一致するもの（表記ゆれがあっても同一人物と分かる）も重複扱いにする
          var dups = all.filter(function (p) {
            var nameMatch = (p.name || '').trim().toLowerCase() === lower;
            var idMatch = wikidataId && p.wikidataId && p.wikidataId === wikidataId;
            return nameMatch || idMatch;
          });
          return { success: true, exists: dups.length > 0, duplicates: dups };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async create(data) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: '選手の追加にはログインが必要です' };
          var fb = await _ready;
          if (!data.allowDuplicate) {
            var dup = await this.checkDuplicate(data.name, data.wikidataId);
            if (dup.success && dup.exists) {
              return { success: false, duplicates: dup.duplicates, message: '同名または同一人物の選手が既に登録されています' };
            }
          }
          var docData = {
            name: data.name,
            nameRomaji: data.nameRomaji || null,
            position: data.position || null,
            nationality: data.nationality || null,
            currentClub: data.currentClub || null,
            currentClubId: data.currentClubId || null,
            marketValue: data.marketValue || null,
            transferStatus: data.transferStatus || null, // 'rumor' | 'completed' | null
            fromClub: data.fromClub || null,
            fromClubId: data.fromClubId || null,
            toClub: data.toClub || null,
            toClubId: data.toClubId || null,
            transferFee: data.transferFee || null,
            bio: data.bio || '',
            profileImage: null,
            // ---- Wikidata/Wikimedia Commons 由来のフィールド（任意。手動登録では空のまま） ----
            birthDate: data.birthDate || null,
            height: data.height || null, // cm単位の数値
            preferredFoot: data.preferredFoot || null, // '右'|'左'|'両足'|null
            shirtNumber: data.shirtNumber || null,
            nationalTeam: data.nationalTeam || null,
            wikidataId: data.wikidataId || null,
            wikipediaUrl: data.wikipediaUrl || null,
            aliases: data.aliases || [],
            // 画像はWikimedia CommonsのURLをそのまま保存（自前でコピーを持たない）。
            // ライセンス・作者・ソースが揃わない画像は photoUrl 自体を null にしてください（呼び出し側の責務）。
            photoUrl: data.photoUrl || null,
            photoLicense: data.photoLicense || null,
            photoAuthor: data.photoAuthor || null,
            photoSource: data.photoSource || null,
            views: 0,
            viewsByDay: {},
            createdBy: u.uid,
            source: data.source || 'user', // 'user'（手動登録） | 'wikidata'（クラブマスタと同様の管理者取込）
            createdAt: tsNow(), updatedAt: tsNow()
          };
          var ref = data.playerId
            ? fb.db.collection('players').doc(data.playerId)
            : fb.db.collection('players').doc();
          await ref.set(docData);
          docData.id = ref.id;
          return { success: true, player: docData };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async update(id, data) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: 'ログインが必要です' };
          var fb = await _ready;
          var patch = {};
          Object.keys(data || {}).forEach(function (k) {
            if (k !== 'allowDuplicate') patch[k] = data[k];
          });
          patch.updatedAt = tsNow();
          await fb.db.collection('players').doc(id).update(patch);
          return { success: true };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      // 選手プロフィールの閲覧数を1増やす（ログイン不要）。
      // 直近7日間の「話題の選手」集計のため、日付ごとの内訳も viewsByDay に記録する。
      async incrementView(id) {
        try {
          var fb = await _ready;
          var todayKey = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"（UTC基準）
          var patch = {};
          patch.views = firebase.firestore.FieldValue.increment(1);
          patch['viewsByDay.' + todayKey] = firebase.firestore.FieldValue.increment(1);
          await fb.db.collection('players').doc(id).update(patch);
          return { success: true };
        } catch (e) { return { success: false, message: String(e) }; }
      }
    },

    // ===== 記事 =====
    articles: {
      async getAll(params) {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('articles').get();
          var list = docList(snap);
          list.sort(function (a, b) { return (b.views || 0) - (a.views || 0); });
          return { success: true, articles: list, count: list.length };
        } catch (e) { return { success: false, message: String(e), articles: [] }; }
      },
      async getById(id) {
        try {
          var fb = await _ready;
          var doc = await fb.db.collection('articles').doc(id).get();
          if (!doc.exists) return { success: false, message: '記事が見つかりません' };
          var data = doc.data(); data.id = doc.id;
          return { success: true, article: data };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async create(articleData) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: 'ログインが必要です' };
          var fb = await _ready;
          var docData = Object.assign({}, articleData, {
            authorId: articleData.authorId || u.uid,
            createdBy: u.uid,
            isPublished: true,
            views: 0, likes: 0, commentsCount: 0,
            createdAt: tsNow(), updatedAt: tsNow()
          });
          var ref = await fb.db.collection('articles').add(docData);
          docData.id = ref.id;
          return { success: true, article: docData };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async update(id, articleData) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: 'ログインが必要です' };
          var fb = await _ready;
          var patch = Object.assign({}, articleData, { updatedAt: tsNow() });
          await fb.db.collection('articles').doc(id).update(patch);
          return { success: true };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async delete(id) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: 'ログインが必要です' };
          var fb = await _ready;
          await fb.db.collection('articles').doc(id).delete();
          return { success: true };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      // 閲覧数を1増やす。未ログインの読者でも呼べる（ログインは不要）
      async incrementView(id) {
        try {
          var fb = await _ready;
          await fb.db.collection('articles').doc(id).update({
            views: firebase.firestore.FieldValue.increment(1)
          });
          return { success: true };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async getByCategory(category, params) {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('articles').where('category', '==', category).get();
          return { success: true, articles: docList(snap) };
        } catch (e) { return { success: false, message: String(e), articles: [] }; }
      },
      async search(keyword, params) {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('articles').get();
          var kw = (keyword || '').trim().toLowerCase().replace(/^#+/, '');
          var list = docList(snap).filter(function (a) {
            var tagsStr = Array.isArray(a.tags) ? a.tags.join(' ') : '';
            return ((a.title || '') + ' ' + (a.description || '') + ' ' + (a.content || '') + ' ' + tagsStr)
              .toLowerCase().indexOf(kw) >= 0;
          });
          return { success: true, articles: list };
        } catch (e) { return { success: false, message: String(e), articles: [] }; }
      }
    },

    // ===== 評価（ログイン不要） =====
    ratings: {
      async create(ratingData) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: '評価にはログインが必要です' };
          if (!ratingData.articleId) return { success: false, message: 'articleId が指定されていません' };
          var fb = await _ready;
          // ドキュメントIDを articleId_userId に固定することで、
          // 同じ人が同じ記事に何度評価しても「1件を上書き」になるようにする（1アカウント1記事1回）
          var docId = ratingData.articleId + '_' + u.uid;
          var docData = Object.assign({}, ratingData, {
            userId: u.uid,
            updatedAt: tsNow()
          });
          var existing = await fb.db.collection('ratings').doc(docId).get();
          if (!existing.exists) docData.createdAt = tsNow();
          await fb.db.collection('ratings').doc(docId).set(docData, { merge: true });
          return { success: true, id: docId };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async getMyRating(articleId) {
        try {
          var u = await currentUser();
          if (!u) return { success: true, rating: null };
          var fb = await _ready;
          var doc = await fb.db.collection('ratings').doc(articleId + '_' + u.uid).get();
          return { success: true, rating: doc.exists ? doc.data() : null };
        } catch (e) { return { success: false, message: String(e), rating: null }; }
      },
      async getByArticle(articleId) {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('ratings').where('articleId', '==', articleId).get();
          return { success: true, ratings: docList(snap) };
        } catch (e) { return { success: false, message: String(e), ratings: [] }; }
      },
      async getByReporter(reporterId) {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('ratings').where('reporterId', '==', reporterId).get();
          return { success: true, ratings: docList(snap) };
        } catch (e) { return { success: false, message: String(e), ratings: [] }; }
      },
      // 記者の評価は「直接評価する」のではなく、その記者名義の記事に付いた評価（★）の平均で算出する
      async getComputedReporterScore(reporterId) {
        try {
          var fb = await _ready;
          var artSnap = await fb.db.collection('articles').where('authorId', '==', reporterId).get();
          var articleIds = artSnap.docs.map(function (d) { return d.id; });
          if (articleIds.length === 0) return { success: true, average: 0, count: 0, articlesCount: 0 };
          var ratingsSnap = await fb.db.collection('ratings').get();
          var relevant = docList(ratingsSnap).filter(function (r) {
            return articleIds.indexOf(r.articleId) !== -1 && typeof r.rating === 'number';
          });
          var count = relevant.length;
          var sum = relevant.reduce(function (s, r) { return s + r.rating; }, 0);
          var average = count > 0 ? (sum / count) : 0;
          return { success: true, average: average, count: count, articlesCount: articleIds.length };
        } catch (e) { return { success: false, message: String(e), average: 0, count: 0, articlesCount: 0 }; }
      }
    },

    // ===== 記者へのクチコミ（レビュー） =====
    reviews: {
      async create(reporterId, comment, username) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: 'レビューの投稿にはログインが必要です' };
          var fb = await _ready;
          var finalUsername = username;
          if (!finalUsername) {
            try {
              var udoc = await fb.db.collection('users').doc(u.uid).get();
              finalUsername = (udoc.exists && udoc.data().username) || '匿名ユーザー';
            } catch (e) { finalUsername = '匿名ユーザー'; }
          }
          var docData = {
            reporterId: reporterId,
            comment: comment || '',
            userId: u.uid,
            username: finalUsername,
            likes: 0, dislikes: 0,
            createdAt: tsNow()
          };
          var ref = await fb.db.collection('reviews').add(docData);
          docData.id = ref.id;
          return { success: true, review: docData };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async getByReporter(reporterId) {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('reviews').where('reporterId', '==', reporterId).get();
          return { success: true, reviews: docList(snap) };
        } catch (e) { return { success: false, message: String(e), reviews: [] }; }
      },
      // いいね/うーん。1アカウント1レビューにつき1回まで（ドキュメントID固定で上書き）
      async vote(reviewId, type) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: '投票にはログインが必要です' };
          if (type !== 'like' && type !== 'dislike') return { success: false, message: '不正な投票です' };
          var fb = await _ready;
          var voteDocId = reviewId + '_' + u.uid;
          var voteRef = fb.db.collection('reviewVotes').doc(voteDocId);
          var existing = await voteRef.get();
          var reviewRef = fb.db.collection('reviews').doc(reviewId);
          var prevType = existing.exists ? existing.data().type : null;
          if (prevType === type) {
            // 同じボタンをもう一度押したら取り消し
            await voteRef.delete();
            await reviewRef.update({ [type + 's']: firebase.firestore.FieldValue.increment(-1) });
            return { success: true, removed: true };
          }
          var updates = {};
          updates[type + 's'] = firebase.firestore.FieldValue.increment(1);
          if (prevType) updates[prevType + 's'] = firebase.firestore.FieldValue.increment(-1);
          await reviewRef.update(updates);
          await voteRef.set({ reviewId: reviewId, userId: u.uid, type: type, updatedAt: tsNow() });
          return { success: true };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async getMyVotes(reviewIds) {
        try {
          var u = await currentUser();
          if (!u || !reviewIds || reviewIds.length === 0) return { success: true, votes: {} };
          var fb = await _ready;
          var votes = {};
          for (var i = 0; i < reviewIds.length; i++) {
            try {
              var d = await fb.db.collection('reviewVotes').doc(reviewIds[i] + '_' + u.uid).get();
              if (d.exists) votes[reviewIds[i]] = d.data().type;
            } catch (e) {}
          }
          return { success: true, votes: votes };
        } catch (e) { return { success: false, message: String(e), votes: {} }; }
      }
    },

    // ===== コメント =====
    comments: {
      async getByArticle(articleId, params) {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('comments').where('articleId', '==', articleId).get();
          return { success: true, comments: docList(snap) };
        } catch (e) { return { success: false, message: String(e), comments: [] }; }
      },
      async create(articleId, content, rating, username, parentId) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: 'コメントの投稿にはログインが必要です' };
          var fb = await _ready;
          // username が渡されなかった場合、Googleアカウントの本名（displayName）に
          // フォールバックすると本名が晒されてしまうため、必ずマイページで設定した
          // 表示名(users/{uid}.username)を参照する。それも無ければ「匿名ユーザー」。
          var finalUsername = username;
          if (!finalUsername) {
            try {
              var udoc = await fb.db.collection('users').doc(u.uid).get();
              if (udoc.exists && udoc.data().username) finalUsername = udoc.data().username;
            } catch (e) { /* 取得できなければ下のフォールバックへ */ }
          }
          var docData = {
            articleId: articleId, content: content, rating: rating || null,
            parentId: parentId || null,
            userId: u.uid, username: finalUsername || '匿名ユーザー', createdAt: tsNow()
          };
          var ref = await fb.db.collection('comments').add(docData);
          docData.id = ref.id;
          return { success: true, comment: docData };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async update(id, content) {
        try {
          var fb = await _ready;
          await fb.db.collection('comments').doc(id).update({ content: content, updatedAt: tsNow() });
          return { success: true };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async delete(id) {
        try {
          var fb = await _ready;
          await fb.db.collection('comments').doc(id).delete();
          return { success: true };
        } catch (e) { return { success: false, message: String(e) }; }
      }
    },

    // ===== ユーザー =====
    users: {
      async get(id) {
        try {
          var fb = await _ready;
          var doc = await fb.db.collection('users').doc(id).get();
          if (!doc.exists) return { success: false, message: 'ユーザーが見つかりません' };
          var data = doc.data(); data.id = doc.id;
          return { success: true, user: data };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async update(id, userData) {
        try {
          var u = await currentUser();
          if (!u || u.uid !== id) return { success: false, message: '権限がありません' };
          var fb = await _ready;
          await fb.db.collection('users').doc(id).set(Object.assign({}, userData, { updatedAt: tsNow() }), { merge: true });
          return { success: true };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      getProfile: function (id) { return this.get(id); }
    },

    // ===== クラブ（旧: ロゴ画像のみを保持する簡易コレクション。ドキュメントIDはクラブ名そのもの） =====
    // ※ getByName/setLogo は既存ページ（クラブページ等）との互換のために残しています。
    //    新しいクラブマスタ機能（clubId をドキュメントIDにする方式）は getAll/saveFull/deleteById を使います。
    //    このため clubs コレクションには「クラブ名がID」の古いドキュメントと
    //    「clubIdがID」の新しいドキュメントが一時的に混在する可能性があります。
    clubs: {
      async getByName(name) {
        try {
          var fb = await _ready;
          var doc = await fb.db.collection('clubs').doc(name).get();
          if (!doc.exists) return { success: true, club: null };
          var data = doc.data(); data.id = doc.id;
          return { success: true, club: data };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async setLogo(name, logoDataUrl) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: 'ログインが必要です' };
          var fb = await _ready;
          await fb.db.collection('clubs').doc(name).set({
            name: name, logo: logoDataUrl, updatedBy: u.uid, updatedAt: tsNow()
          }, { merge: true });
          return { success: true };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async getAll() {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('clubs').get();
          return { success: true, clubs: docList(snap) };
        } catch (e) { return { success: false, message: String(e), clubs: [] }; }
      },
      async getById(clubId) {
        try {
          var fb = await _ready;
          var doc = await fb.db.collection('clubs').doc(clubId).get();
          if (!doc.exists) return { success: true, club: null };
          var data = doc.data(); data.id = doc.id;
          return { success: true, club: data };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      // クラブマスタの新規作成・更新（clubId をドキュメントIDとする）。管理者のみ（Firestoreルール側で強制）。
      async saveFull(clubId, data) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: 'ログインが必要です' };
          var fb = await _ready;
          var ref = fb.db.collection('clubs').doc(clubId);
          var existing = await ref.get();
          var payload = Object.assign({}, data, { clubId: clubId, updatedBy: u.uid, updatedAt: tsNow() });
          if (!existing.exists) payload.createdAt = tsNow();
          await ref.set(payload, { merge: true });
          return { success: true };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async deleteById(clubId) {
        try {
          var fb = await _ready;
          await fb.db.collection('clubs').doc(clubId).delete();
          return { success: true };
        } catch (e) { return { success: false, message: String(e) }; }
      }
    },

    // ===== リーグマスタ（ドキュメントID＝leagueId） =====
    leagues: {
      async getAll() {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('leagues').get();
          return { success: true, leagues: docList(snap) };
        } catch (e) { return { success: false, message: String(e), leagues: [] }; }
      },
      async saveFull(leagueId, data) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: 'ログインが必要です' };
          var fb = await _ready;
          var ref = fb.db.collection('leagues').doc(leagueId);
          var existing = await ref.get();
          var payload = Object.assign({}, data, { leagueId: leagueId, updatedBy: u.uid, updatedAt: tsNow() });
          if (!existing.exists) payload.createdAt = tsNow();
          await ref.set(payload, { merge: true });
          return { success: true };
        } catch (e) { return { success: false, message: String(e) }; }
      }
    },

    // ===== メディア（媒体そのものを登録するコレクション。ドキュメントID＝メディア名） =====
    media: {
      async getAll() {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('media').get();
          return { success: true, media: docList(snap) };
        } catch (e) { return { success: false, message: String(e), media: [] }; }
      },
      async getByName(name) {
        try {
          var fb = await _ready;
          var doc = await fb.db.collection('media').doc(name).get();
          if (!doc.exists) return { success: true, media: null };
          var data = doc.data(); data.id = doc.id;
          return { success: true, media: data };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async create(data) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: 'メディアの追加にはログインが必要です' };
          if (!data.name) return { success: false, message: 'メディア名は必須です' };
          var fb = await _ready;
          var existing = await fb.db.collection('media').doc(data.name).get();
          if (existing.exists) return { success: false, message: '同名のメディアが既に登録されています' };
          var docData = {
            name: data.name,
            description: data.description || '',
            website: data.website || null,
            logo: data.logo || null,
            createdBy: u.uid,
            createdAt: tsNow(), updatedAt: tsNow()
          };
          await fb.db.collection('media').doc(data.name).set(docData);
          return { success: true, id: data.name };
        } catch (e) { return { success: false, message: String(e) }; }
      },
      async update(name, data) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: 'ログインが必要です' };
          var fb = await _ready;
          await fb.db.collection('media').doc(name).set(Object.assign({}, data, { updatedAt: tsNow() }), { merge: true });
          return { success: true };
        } catch (e) { return { success: false, message: String(e) }; }
      }
    }
  };

  if (typeof window !== 'undefined') window.GegenPressAPI = GegenPressAPI;
  if (typeof module !== 'undefined' && module.exports) module.exports = GegenPressAPI;
})();
