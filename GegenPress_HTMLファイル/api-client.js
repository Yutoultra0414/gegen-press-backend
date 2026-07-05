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

  var _ready = ensureFirebase().catch(function (e) {
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
          var cred = await fb.auth.signInWithPopup(provider);
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
      async checkDuplicate(name) {
        try {
          var fb = await _ready;
          var snap = await fb.db.collection('players').get();
          var lower = (name || '').trim().toLowerCase();
          var dups = docList(snap).filter(function (p) {
            return (p.name || '').trim().toLowerCase() === lower;
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
            var dup = await this.checkDuplicate(data.name);
            if (dup.success && dup.exists) {
              return { success: false, duplicates: dup.duplicates, message: '同名の選手が既に登録されています' };
            }
          }
          var docData = {
            name: data.name,
            position: data.position || null,
            nationality: data.nationality || null,
            currentClub: data.currentClub || null,
            transferStatus: data.transferStatus || null, // 'rumor' | 'completed' | null
            fromClub: data.fromClub || null,
            toClub: data.toClub || null,
            transferFee: data.transferFee || null,
            bio: data.bio || '',
            profileImage: null,
            createdBy: u.uid,
            source: 'user',
            createdAt: tsNow(), updatedAt: tsNow()
          };
          var ref = await fb.db.collection('players').add(docData);
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
          var kw = (keyword || '').trim().toLowerCase();
          var list = docList(snap).filter(function (a) {
            return ((a.title || '') + ' ' + (a.description || '') + ' ' + (a.content || ''))
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
          var fb = await _ready;
          var u = await currentUser();
          var docData = Object.assign({}, ratingData, {
            userId: u ? u.uid : null,
            createdAt: tsNow()
          });
          var ref = await fb.db.collection('ratings').add(docData);
          return { success: true, id: ref.id };
        } catch (e) { return { success: false, message: String(e) }; }
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
      }
    },

    // ===== 記者へのクチコミ（レビュー） =====
    reviews: {
      async create(reporterId, rating, comment, username) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: 'レビューの投稿にはログインが必要です' };
          var fb = await _ready;
          var docData = {
            reporterId: reporterId,
            rating: rating || null,
            comment: comment || '',
            userId: u.uid,
            username: username || u.displayName || '匿名ユーザー',
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
      async create(articleId, content, rating, username) {
        try {
          var u = await currentUser();
          if (!u) return { success: false, message: 'コメントの投稿にはログインが必要です' };
          var fb = await _ready;
          var docData = {
            articleId: articleId, content: content, rating: rating || null,
            userId: u.uid, username: username || u.displayName || '匿名ユーザー', createdAt: tsNow()
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
    }
  };

  if (typeof window !== 'undefined') window.GegenPressAPI = GegenPressAPI;
  if (typeof module !== 'undefined' && module.exports) module.exports = GegenPressAPI;
})();
