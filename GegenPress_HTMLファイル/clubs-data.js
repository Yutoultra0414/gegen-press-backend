// clubs-data.js
// 選手登録フォームで使う「クラブ」「国籍」の選択肢データ（共有ファイル）。
// クラブは代表的なものを一部のみ収録した手作りリストです（網羅的ではありません）。
// リストにないクラブは「その他（自由入力）」から入力できます。
(function (global) {
    var CLUBS = [
        // { name, league, country }
        { name: 'マンチェスター・シティ', league: 'プレミアリーグ', country: 'イングランド' },
        { name: 'マンチェスター・ユナイテッド', league: 'プレミアリーグ', country: 'イングランド' },
        { name: 'リヴァプール', league: 'プレミアリーグ', country: 'イングランド' },
        { name: 'アーセナル', league: 'プレミアリーグ', country: 'イングランド' },
        { name: 'チェルシー', league: 'プレミアリーグ', country: 'イングランド' },
        { name: 'トッテナム・ホットスパー', league: 'プレミアリーグ', country: 'イングランド' },
        { name: 'ニューカッスル・ユナイテッド', league: 'プレミアリーグ', country: 'イングランド' },
        { name: 'アストン・ヴィラ', league: 'プレミアリーグ', country: 'イングランド' },
        { name: 'ウェストハム・ユナイテッド', league: 'プレミアリーグ', country: 'イングランド' },
        { name: 'ブライトン・アンド・ホーヴ・アルビオン', league: 'プレミアリーグ', country: 'イングランド' },

        { name: 'レアル・マドリード', league: 'ラリーガ', country: 'スペイン' },
        { name: 'FCバルセロナ', league: 'ラリーガ', country: 'スペイン' },
        { name: 'アトレティコ・マドリード', league: 'ラリーガ', country: 'スペイン' },
        { name: 'アスレティック・ビルバオ', league: 'ラリーガ', country: 'スペイン' },
        { name: 'レアル・ソシエダ', league: 'ラリーガ', country: 'スペイン' },
        { name: 'セビージャ', league: 'ラリーガ', country: 'スペイン' },
        { name: 'バレンシア', league: 'ラリーガ', country: 'スペイン' },
        { name: 'ビジャレアル', league: 'ラリーガ', country: 'スペイン' },

        { name: '横浜Fマリノス', league: 'Jリーグ', country: '日本' },
        { name: '川崎フロンターレ', league: 'Jリーグ', country: '日本' },
        { name: '浦和レッズ', league: 'Jリーグ', country: '日本' },
        { name: '鹿島アントラーズ', league: 'Jリーグ', country: '日本' },
        { name: 'ヴィッセル神戸', league: 'Jリーグ', country: '日本' },
        { name: 'FC東京', league: 'Jリーグ', country: '日本' },
        { name: 'サンフレッチェ広島', league: 'Jリーグ', country: '日本' },
        { name: 'セレッソ大阪', league: 'Jリーグ', country: '日本' },
        { name: 'ガンバ大阪', league: 'Jリーグ', country: '日本' },
        { name: '名古屋グランパス', league: 'Jリーグ', country: '日本' },

        { name: 'ユヴェントス', league: 'セリエA', country: 'イタリア' },
        { name: 'ACミラン', league: 'セリエA', country: 'イタリア' },
        { name: 'インテル・ミラノ', league: 'セリエA', country: 'イタリア' },
        { name: 'ASローマ', league: 'セリエA', country: 'イタリア' },
        { name: 'SSナポリ', league: 'セリエA', country: 'イタリア' },
        { name: 'ラツィオ', league: 'セリエA', country: 'イタリア' },
        { name: 'フィオレンティーナ', league: 'セリエA', country: 'イタリア' },
        { name: 'アタランタ', league: 'セリエA', country: 'イタリア' },

        { name: 'バイエルン・ミュンヘン', league: 'ブンデスリーガ', country: 'ドイツ' },
        { name: 'ボルシア・ドルトムント', league: 'ブンデスリーガ', country: 'ドイツ' },
        { name: 'RBライプツィヒ', league: 'ブンデスリーガ', country: 'ドイツ' },
        { name: 'バイエル・レバークーゼン', league: 'ブンデスリーガ', country: 'ドイツ' },
        { name: 'アイントラハト・フランクフルト', league: 'ブンデスリーガ', country: 'ドイツ' },
        { name: 'ボルシアMグラードバッハ', league: 'ブンデスリーガ', country: 'ドイツ' },

        { name: 'パリ・サンジェルマン', league: 'リーグアン', country: 'フランス' },
        { name: 'オリンピック・マルセイユ', league: 'リーグアン', country: 'フランス' },
        { name: 'ASモナコ', league: 'リーグアン', country: 'フランス' },
        { name: 'オリンピック・リヨン', league: 'リーグアン', country: 'フランス' },
        { name: 'LOSCリール', league: 'リーグアン', country: 'フランス' },
        { name: 'スタッド・レンヌ', league: 'リーグアン', country: 'フランス' }
    ];

    var NATIONALITIES = [
        '日本', '韓国', '中国',
        'イングランド', 'スペイン', 'ドイツ', 'イタリア', 'フランス', 'ポルトガル', 'オランダ', 'ベルギー',
        'クロアチア', 'セルビア', 'ポーランド', 'ウクライナ', 'スイス', 'オーストリア', 'デンマーク',
        'スウェーデン', 'ノルウェー', 'ウェールズ', 'スコットランド', 'アイルランド', 'トルコ', 'ギリシャ',
        'ブラジル', 'アルゼンチン', 'ウルグアイ', 'コロンビア', 'エクアドル', 'チリ', 'パラグアイ', 'ペルー',
        'アメリカ', 'カナダ', 'メキシコ',
        'モロッコ', 'アルジェリア', 'チュニジア', 'エジプト', 'セネガル', 'ナイジェリア', 'カメルーン',
        'コートジボワール', 'ガーナ', '南アフリカ',
        'オーストラリア', 'サウジアラビア', 'イラン', 'カタール', 'アラブ首長国連邦'
    ];

    global.GegenPressClubsData = { CLUBS: CLUBS, NATIONALITIES: NATIONALITIES };
})(window);
