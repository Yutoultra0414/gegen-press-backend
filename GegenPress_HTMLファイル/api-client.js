/**
 * Gegen Press! API クライアント
 * フロントエンドのHTMLから読み込んで使用します
 * 使い方: <script src="api-client.js"></script>
 */

// APIベースURL（環境に応じて自動判定 or グローバル設定で上書き可）
let API_BASE_URL = (() => {
  // グローバルに設定されていればそれを使う（デプロイ環境から window.GEGEN_API_URL で指定可能）
  if (typeof window !== 'undefined' && window.GEGEN_API_URL) {
    return window.GEGEN_API_URL;
  }
  // 開発環境：localhost:3001
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001/api';
  }
  // 本番環境：バックエンドのデプロイ先（Cloud Run など）
  // デフォルトはhttpsで、ホスト名は同じか別ドメイン
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol; // http: or https:
    // 本番では https://api.gegen-press.com/api など、環境に応じて設定
    // ここではデフォルトとして同ドメインの /api パスを想定
    return proto + '//' + window.location.host + '/api';
  }
  return 'http://localhost:3001/api';
})();

const GegenPressAPI = {
  // トークンの保存・取得（メモリ内、※本番はより安全な方法を検討）
  _token: null,

  setToken(token) {
    this._token = token;
  },

  getToken() {
    return this._token;
  },

  // 共通のリクエスト処理
  async _request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this._token) {
      headers['Authorization'] = `Bearer ${this._token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API エラー:', error);
      return { success: false, message: 'ネットワークエラーが発生しました' };
    }
  },

  // ===== 認証 =====
  auth: {
    signup(email, password, username) {
      return GegenPressAPI._request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, username }),
      });
    },
    login(idToken) {
      return GegenPressAPI._request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      });
    },
    logout() {
      return GegenPressAPI._request('/auth/logout', { method: 'POST' });
    },
    resetPassword(email) {
      return GegenPressAPI._request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },
    verify() {
      return GegenPressAPI._request('/auth/verify');
    },
  },

  // ===== 記事 =====
  articles: {
    getAll(params = {}) {
      const query = new URLSearchParams(params).toString();
      return GegenPressAPI._request(`/articles?${query}`);
    },
    getById(id) {
      return GegenPressAPI._request(`/articles/${id}`);
    },
    create(articleData) {
      return GegenPressAPI._request('/articles', {
        method: 'POST',
        body: JSON.stringify(articleData),
      });
    },
    update(id, articleData) {
      return GegenPressAPI._request(`/articles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(articleData),
      });
    },
    delete(id) {
      return GegenPressAPI._request(`/articles/${id}`, { method: 'DELETE' });
    },
    getByCategory(category, params = {}) {
      const query = new URLSearchParams(params).toString();
      return GegenPressAPI._request(`/articles/category/${category}?${query}`);
    },
    search(keyword, params = {}) {
      const query = new URLSearchParams({ q: keyword, ...params }).toString();
      return GegenPressAPI._request(`/articles/search?${query}`);
    },
  },

  // ===== コメント =====
  comments: {
    getByArticle(articleId, params = {}) {
      const query = new URLSearchParams(params).toString();
      return GegenPressAPI._request(`/comments/${articleId}?${query}`);
    },
    create(articleId, content, rating) {
      return GegenPressAPI._request('/comments', {
        method: 'POST',
        body: JSON.stringify({ articleId, content, rating }),
      });
    },
    update(id, content) {
      return GegenPressAPI._request(`/comments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      });
    },
    delete(id) {
      return GegenPressAPI._request(`/comments/${id}`, { method: 'DELETE' });
    },
  },

  // ===== 評価（ログイン不要） =====
  ratings: {
    create(ratingData) {
      return GegenPressAPI._request('/ratings', {
        method: 'POST',
        body: JSON.stringify(ratingData),
      });
    },
    getByArticle(articleId) {
      return GegenPressAPI._request(`/ratings/${articleId}`);
    },
    getByReporter(reporterId) {
      return GegenPressAPI._request(`/ratings/reporter/${reporterId}`);
    },
  },

  // ===== ユーザー =====
  users: {
    get(id) {
      return GegenPressAPI._request(`/users/${id}`);
    },
    update(id, userData) {
      return GegenPressAPI._request(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
    },
    getProfile(id) {
      return GegenPressAPI._request(`/users/${id}/profile`);
    },
    follow(id) {
      return GegenPressAPI._request(`/users/${id}/follow`, { method: 'POST' });
    },
    unfollow(id) {
      return GegenPressAPI._request(`/users/${id}/follow`, { method: 'DELETE' });
    },
    getBookmarks(id) {
      return GegenPressAPI._request(`/users/${id}/bookmarks`);
    },
    addBookmark(id, articleId) {
      return GegenPressAPI._request(`/users/${id}/bookmarks`, {
        method: 'POST',
        body: JSON.stringify({ articleId }),
      });
    },
    removeBookmark(id, articleId) {
      return GegenPressAPI._request(`/users/${id}/bookmarks/${articleId}`, {
        method: 'DELETE',
      });
    },
  },

  // ===== 記者 =====
  reporters: {
    getAll(params = {}) {
      const query = new URLSearchParams(params).toString();
      return GegenPressAPI._request(`/reporters?${query}`);
    },
    getById(id) {
      return GegenPressAPI._request(`/reporters/${id}`);
    },
    getRanking(params = {}) {
      const query = new URLSearchParams(params).toString();
      return GegenPressAPI._request(`/reporters/ranking?${query}`);
    },
    getArticles(id, params = {}) {
      const query = new URLSearchParams(params).toString();
      return GegenPressAPI._request(`/reporters/${id}/articles?${query}`);
    },
    getReviews(id) {
      return GegenPressAPI._request(`/reporters/${id}/reviews`);
    },
    // 記者名の重複チェック（作成前の確認用）
    checkDuplicate(name) {
      const query = new URLSearchParams({ name }).toString();
      return GegenPressAPI._request(`/reporters/check-duplicate?${query}`);
    },
    // 記者を追加（ログイン必須）
    create(reporterData) {
      return GegenPressAPI._request('/reporters', {
        method: 'POST',
        body: JSON.stringify(reporterData),
      });
    },
    // 記者情報を編集（追加した本人のみ・ログイン必須）
    update(id, reporterData) {
      return GegenPressAPI._request(`/reporters/${id}`, {
        method: 'PUT',
        body: JSON.stringify(reporterData),
      });
    },
  },
};

// グローバルに公開
if (typeof window !== 'undefined') {
  window.GegenPressAPI = GegenPressAPI;
}

// Node.js での利用も可能に
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GegenPressAPI;
}
