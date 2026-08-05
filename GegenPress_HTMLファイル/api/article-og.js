// api/article-og.js
//
// 記事詳細ページ(gegen_press_article_detail.html)を、記事ごとに正しい
// og:title / og:description / og:image を差し込んだ状態で返す Vercel サーバーレス関数。
//
// なぜ必要か:
// X(Twitter)などSNSのクローラーはJavaScriptを実行しないため、
// 「ページを開いた後にJSでFirestoreから記事データを読み込んで表示する」今の作りのままだと、
// クローラーには記事ごとの情報が一切見えず、共有カードに正しい画像・タイトルを出せません。
// この関数は、リクエストが来た瞬間にサーバー側でFirestoreから該当記事を取得し、
// 静的HTMLの<head>に og:/twitter: メタタグを差し込んでから返します。
// 人間のユーザーがアクセスした場合も同じHTMLが返るだけなので、
// これまで通りブラウザ側のJavaScriptがFirestoreを読みに行って表示を作ります(挙動は変わりません)。
//
// 認証情報は不要です: articles コレクションは firestore.rules で
// `allow read: if true` になっており、Firebase設定(apiKey等)も
// api-client.js内で「公開前提の値」と明記されている値をそのまま使っています。

const fs = require('fs');
const path = require('path');

// api-client.js と同じ値(公開前提。秘密鍵ではありません)
const FIREBASE_PROJECT_ID = 'gegen-press';
const FIREBASE_API_KEY = 'AIzaSyDyisueW3srtm60_Y1oiE4mf5Rcy6_gB6Y';

const SITE_NAME = 'Gegen Press!';
// TODO: 実際の本番ドメインが決まったら、ここをそのドメイン上のロゴ画像URLに書き換えてください。
// (og:image は相対パスではなく絶対URLである必要があるため、実行時にホスト名から組み立てます)
const DEFAULT_IMAGE_PATH = '/logo.png';
const DEFAULT_DESCRIPTION = '海外サッカー記者の報道をまとめるニュース・コラムサイト';

function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// FirestoreのREST APIが返すフィールド値(型付きオブジェクト)から素の値を取り出す
function fsValue(fields, key) {
    const f = fields && fields[key];
    if (!f) return null;
    if ('stringValue' in f) return f.stringValue;
    if ('integerValue' in f) return f.integerValue;
    if ('doubleValue' in f) return f.doubleValue;
    return null;
}

module.exports = async function handler(req, res) {
    const id = (req.query && req.query.id) || '';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = proto + '://' + host;
    const pageUrl = origin + '/gegen_press_article_detail.html' + (id ? ('?id=' + encodeURIComponent(id)) : '');

    // テンプレートHTMLを読み込む(このファイルと同じリポジトリにコミットされている前提)
    // ルート直下に置いている想定です。実際の配置場所が違う場合はここのパスを調整してください。
    const templatePath = path.join(process.cwd(), 'gegen_press_article_detail.html');
    let html;
    try {
        html = fs.readFileSync(templatePath, 'utf8');
    } catch (e) {
        res.status(500).send('記事ページのテンプレートが見つかりませんでした: ' + templatePath);
        return;
    }

    let title = SITE_NAME;
    let description = DEFAULT_DESCRIPTION;
    let image = origin + DEFAULT_IMAGE_PATH;

    if (id) {
        try {
            const url = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID +
                '/databases/(default)/documents/articles/' + encodeURIComponent(id) +
                '?key=' + FIREBASE_API_KEY;
            const r = await fetch(url);
            if (r.ok) {
                const doc = await r.json();
                const fields = doc.fields || {};
                const t = fsValue(fields, 'title');
                const d = fsValue(fields, 'description') || fsValue(fields, 'content');
                const img = fsValue(fields, 'image');
                if (t) title = t;
                if (d) description = String(d).slice(0, 120);
                if (img) image = img; // Firestore側に絶対URLで保存されている前提
            }
            // 404などでも致命的エラーにはせず、デフォルトのメタ情報のままページ自体は返す
        } catch (e) {
            console.error('OG用の記事取得に失敗しました:', e);
        }
    }

    const metaTags = [
        '<title>' + esc(title) + ' - ' + esc(SITE_NAME) + '</title>',
        '<meta property="og:type" content="article">',
        '<meta property="og:site_name" content="' + esc(SITE_NAME) + '">',
        '<meta property="og:title" content="' + esc(title) + '">',
        '<meta property="og:description" content="' + esc(description) + '">',
        '<meta property="og:image" content="' + esc(image) + '">',
        '<meta property="og:url" content="' + esc(pageUrl) + '">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:title" content="' + esc(title) + '">',
        '<meta name="twitter:description" content="' + esc(description) + '">',
        '<meta name="twitter:image" content="' + esc(image) + '">'
    ].join('\n    ');

    // 元の<title>タグを取り除き、<head>の直後に上記メタタグをまとめて差し込む
    html = html.replace(/<title>[\s\S]*?<\/title>/, '');
    html = html.replace('<head>', '<head>\n    ' + metaTags);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // クローラー・実ユーザーとも同じ内容なので短めにキャッシュ(記事の更新が反映されるまでの猶予は5分)
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');
    res.status(200).send(html);
};
