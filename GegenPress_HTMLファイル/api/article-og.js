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
// テンプレートHTMLの取得方法について(重要):
// 以前は fs.readFileSync でこのファイルと同じリポジトリ内のHTMLを直接読んでいましたが、
// Vercelのビルド時にそのファイルが関数の実行環境に同梱されないことがあり、
// 何度直しても安定しなかったため、この方式はやめました。
// 代わりに、同じサイト上で普通に公開されている gegen_press_article_detail.html を
// HTTP経由でそのまま取得します。これなら「ビルド時に同梱されるか」という不安定な要素に
// 依存せず、実際にブラウザからアクセスできているのと同じ内容が確実に取得できます。
// ★ 注意: この関数は /gegen_press_article_detail.html を rewrite 先にしないでください。
//   (静的ファイルが実在するため rewrite は発動しない仕様ですが、万一将来
//    何らかの理由で発動するようになると、この関数からの取得が無限ループします)
//
// 認証情報は不要です: articles コレクションは firestore.rules で
// `allow read: if true` になっており、Firebase設定(apiKey等)も
// api-client.js内で「公開前提の値」と明記されている値をそのまま使っています。

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

    // テンプレートHTMLを、ファイルシステムではなくHTTP経由で取得する
    let html;
    try {
        const templateRes = await fetch(origin + '/gegen_press_article_detail.html');
        if (!templateRes.ok) throw new Error('テンプレート取得時にHTTP ' + templateRes.status);
        html = await templateRes.text();
    } catch (e) {
        // テンプレートが取得できない場合でも、記事ページごとサイトを落とさない。
        console.error('OGテンプレートの取得に失敗しました:', e);
        res.writeHead(302, { Location: '/gegen_press_top.html' });
        res.end();
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
                // Firestore側にBase64データURI(data:image/...)で保存されている画像は、
                // og:imageとして使えない(SNSのクローラーはURLを別途取得しに行く仕様のため)。
                // その場合はサイトロゴにフォールバックする。
                if (img && !String(img).startsWith('data:')) image = img;
            }
            // 404などでも致命的エラーにはせず、デフォルトのメタ情報のままページ自体は返す
        } catch (e) {
            console.error('OG用の記事取得に失敗しました:', e);
        }
    }

    const metaTags = [
        '<base href="' + esc(origin) + '/">',
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
