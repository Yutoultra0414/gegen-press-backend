/**
 * /api/analyze-screenshot
 *
 * ニュース・コラムの投稿画面から呼ばれる。スクリーンショット画像を受け取り、
 * Gemini APIでOCR＋日本語への翻訳（要約）＋項目分けを行い、フォームへの
 * 「下書き」として使える構造化データを返す。
 *
 * セキュリティ設計（詳しくはREADME_AI_SCREENSHOT.md参照）:
 *   - Gemini APIキーはこの関数の中（サーバー側の環境変数）にしか存在しない。
 *     ブラウザには一切渡らない。
 *   - 1日10回/ユーザーの上限は、この関数の中の変数ではなく、Firestoreの
 *     セキュリティルール（aiUsage コレクション）で強制する。
 *     ユーザー本人のIDトークンでFirestoreの利用回数カウンターを+1しようとし、
 *     ルールがそれを許可した場合（＝上限未満だった場合）だけ、実際にGeminiを呼ぶ。
 *     これにより、この関数自身が「今日何回使われたか」を管理する必要がなく、
 *     Firestore側の検証だけで不正な連打を防げる。
 *   - トークンの正当性そのものも、Firestore自身が検証する（このコードでは
 *     署名検証を行わず、JWTのペイロードをただ読んでいるだけ。もし偽造された
 *     トークンであれば、後続のFirestoreへの書き込みリクエスト自体が拒否される）。
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'POSTのみ対応しています' });
    return;
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    res.status(500).json({ success: false, message: 'サーバー側の設定が未完了です（GEMINI_API_KEY未設定）' });
    return;
  }

  const { idToken, image, contentType } = req.body || {};
  if (!idToken || !image) {
    res.status(400).json({ success: false, message: 'idToken と image は必須です' });
    return;
  }

  // ---- ① IDトークンから uid / project を読み取る（署名検証はしない。安全性の根拠は上記コメント参照） ----
  let uid, projectId;
  try {
    const payloadB64 = idToken.split('.')[1];
    const payloadJson = Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);
    uid = payload.sub || payload.user_id;
    projectId = payload.aud;
    if (!uid || !projectId) throw new Error('uid/projectIdが取得できません');
  } catch (e) {
    res.status(400).json({ success: false, message: 'ログイン情報を読み取れませんでした。再ログインしてお試しください。' });
    return;
  }

  // ---- ② Firestoreの利用回数カウンターを+1しようとする（ここが実質的な1日10回の関所） ----
  const todayKey = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"（UTC基準）
  const docId = uid + '_' + todayKey;
  const docPath = 'projects/' + projectId + '/databases/(default)/documents/aiUsage/' + docId;
  const firestoreBase = 'https://firestore.googleapis.com/v1/' + docPath;

  try {
    const getRes = await fetch(firestoreBase, {
      headers: { Authorization: 'Bearer ' + idToken }
    });

    if (getRes.status === 404) {
      // 今日はまだ未使用 → count:1 で新規作成
      const createRes = await fetch(
        'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents/aiUsage?documentId=' + encodeURIComponent(docId),
        {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + idToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { count: { integerValue: '1' } } })
        }
      );
      if (!createRes.ok) {
        res.status(429).json({ success: false, rateLimited: true, message: '利用回数の記録に失敗しました。時間をおいて再度お試しください。' });
        return;
      }
    } else if (getRes.ok) {
      const doc = await getRes.json();
      const current = parseInt((doc.fields && doc.fields.count && doc.fields.count.integerValue) || '0', 10);
      // ここでは「10回以上なら即エラー」という判定をこの関数自身ではしない。
      // 管理者は上限なしというルールが Firestore 側にあるため、実際に書き込みを試みて、
      // その成否（＝Firestoreのルールが許可したかどうか）だけを見て判断する。
      const patchRes = await fetch(firestoreBase + '?updateMask.fieldPaths=count', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + idToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { count: { integerValue: String(current + 1) } } })
      });
      if (!patchRes.ok) {
        res.status(429).json({ success: false, rateLimited: true, message: '本日の自動入力は10回に達しました。明日また使えます（それまでは手入力をお願いします）。' });
        return;
      }
    } else {
      res.status(401).json({ success: false, message: 'ログイン状態を確認できませんでした。再ログインしてお試しください。' });
      return;
    }
  } catch (e) {
    res.status(500).json({ success: false, message: '利用回数の確認中にエラーが発生しました: ' + e.message });
    return;
  }

  // ---- ③ ここまで来たら上限内。Geminiに画像を送って下書きを作らせる ----
  const isColumn = contentType === 'column';
  const categoryOptions = isColumn
    ? ['移籍分析', '戦術分析', '選手考察', '監督・クラブ経営', '育成・下部組織', 'ジャーナリスト論', 'メディア論', '海外の反応', 'コラム全般', 'その他']
    : ['移籍情報', 'プレミアリーグ', 'ラリーガ', 'セリエA', 'ブンデスリーガ', 'リーグアン', 'エールディヴィジ', 'プリメイラ・リーガ', 'MLS', '日本サッカー', '代表チーム', 'その他リーグ'];

  const promptText = [
    '添付はサッカー関連のSNS投稿・記事のスクリーンショットです。以下を行い、指定したJSON形式のみで返答してください。',
    '1. 画像内の文章を読み取り、内容を理解する（英語・スペイン語・イタリア語等どの言語でもよい）。',
    '2. 見出し(headline): 80文字以内の日本語の見出しを作る。',
    '3. 概要(description): 1〜2文・140文字以内で日本語要約する。',
    '4. 本文(body): 日本語で300〜600文字程度の記事文にする。**画像の文章をそのまま翻訳するのではなく、内容を理解した上で自分の言葉で書き直す**こと（著作権上、原文の逐語訳・丸写しは禁止）。',
    '5. ハッシュタグ(hashtags): 関連する選手名・クラブ名などを日本語表記で3〜6個、配列で。',
    '6. サブカテゴリ(suggestedCategory): 次の選択肢から最も近いものを1つだけ厳密に選ぶ: ' + categoryOptions.join('、'),
    !isColumn ? '7. 記者名(reporterNameGuess): 画像内に記者・ジャーナリストの名前（アカウント名等）が見て取れる場合、その表記のまま入れる。わからなければ空文字。' : '',
    !isColumn ? '8. 記事の種類(suggestedArticleTypes): 「移籍記事」「インタビュー記事」「一般記事」のうち当てはまるものを配列で（複数可）。' : '',
    '画像から読み取れない項目は空文字または空配列にしてください。推測で断定的な事実を作り上げないでください。'
  ].filter(Boolean).join('\n');

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      headline: { type: 'STRING' },
      description: { type: 'STRING' },
      body: { type: 'STRING' },
      hashtags: { type: 'ARRAY', items: { type: 'STRING' } },
      suggestedCategory: { type: 'STRING' },
      reporterNameGuess: { type: 'STRING' },
      suggestedArticleTypes: { type: 'ARRAY', items: { type: 'STRING' } }
    },
    required: ['headline', 'description', 'body', 'hashtags', 'suggestedCategory']
  };

  try {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(image);
    if (!match) {
      res.status(400).json({ success: false, message: '画像データの形式が正しくありません' });
      return;
    }
    const mimeType = match[1];
    const base64Data = match[2];

    const geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
      {
        method: 'POST',
        headers: { 'x-goog-api-key': GEMINI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: promptText },
              { inlineData: { mimeType: mimeType, data: base64Data } }
            ]
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      res.status(502).json({ success: false, message: 'AIの解析に失敗しました。時間をおいて再度お試しください。', detail: errText.slice(0, 300) });
      return;
    }

    const geminiJson = await geminiRes.json();
    const textOut = geminiJson.candidates && geminiJson.candidates[0] && geminiJson.candidates[0].content
      && geminiJson.candidates[0].content.parts && geminiJson.candidates[0].content.parts[0]
      && geminiJson.candidates[0].content.parts[0].text;

    if (!textOut) {
      res.status(502).json({ success: false, message: 'AIから有効な結果が返りませんでした。' });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(textOut);
    } catch (e) {
      res.status(502).json({ success: false, message: 'AIの結果を読み取れませんでした。' });
      return;
    }

    res.status(200).json({ success: true, draft: parsed });
  } catch (e) {
    res.status(500).json({ success: false, message: 'AI解析中にエラーが発生しました: ' + e.message });
  }
}
