// clubs-data.js
// 選手登録フォームで使う「クラブ」「国籍」の選択肢データ（共有ファイル）。
// クラブは代表的なものを一部のみ収録した手作りリストです（網羅的ではありません）。
// リストにないクラブ・国籍は「その他（自由入力）」から入力できます。
// continent は大陸選択の絞り込み用、flag は国旗の絵文字です。
(function (global) {
    var CLUBS = [
        // { name, league, country, continent }
        { name: 'マンチェスター・シティ', league: 'プレミアリーグ', country: 'イングランド', continent: 'ヨーロッパ' },
        { name: 'マンチェスター・ユナイテッド', league: 'プレミアリーグ', country: 'イングランド', continent: 'ヨーロッパ' },
        { name: 'リヴァプール', league: 'プレミアリーグ', country: 'イングランド', continent: 'ヨーロッパ' },
        { name: 'アーセナル', league: 'プレミアリーグ', country: 'イングランド', continent: 'ヨーロッパ' },
        { name: 'チェルシー', league: 'プレミアリーグ', country: 'イングランド', continent: 'ヨーロッパ' },
        { name: 'トッテナム・ホットスパー', league: 'プレミアリーグ', country: 'イングランド', continent: 'ヨーロッパ' },
        { name: 'ニューカッスル・ユナイテッド', league: 'プレミアリーグ', country: 'イングランド', continent: 'ヨーロッパ' },
        { name: 'アストン・ヴィラ', league: 'プレミアリーグ', country: 'イングランド', continent: 'ヨーロッパ' },
        { name: 'ウェストハム・ユナイテッド', league: 'プレミアリーグ', country: 'イングランド', continent: 'ヨーロッパ' },
        { name: 'ブライトン・アンド・ホーヴ・アルビオン', league: 'プレミアリーグ', country: 'イングランド', continent: 'ヨーロッパ' },

        { name: 'レアル・マドリード', league: 'ラリーガ', country: 'スペイン', continent: 'ヨーロッパ' },
        { name: 'FCバルセロナ', league: 'ラリーガ', country: 'スペイン', continent: 'ヨーロッパ' },
        { name: 'アトレティコ・マドリード', league: 'ラリーガ', country: 'スペイン', continent: 'ヨーロッパ' },
        { name: 'アスレティック・ビルバオ', league: 'ラリーガ', country: 'スペイン', continent: 'ヨーロッパ' },
        { name: 'レアル・ソシエダ', league: 'ラリーガ', country: 'スペイン', continent: 'ヨーロッパ' },
        { name: 'セビージャ', league: 'ラリーガ', country: 'スペイン', continent: 'ヨーロッパ' },
        { name: 'バレンシア', league: 'ラリーガ', country: 'スペイン', continent: 'ヨーロッパ' },
        { name: 'ビジャレアル', league: 'ラリーガ', country: 'スペイン', continent: 'ヨーロッパ' },

        { name: '横浜Fマリノス', league: 'Jリーグ', country: '日本', continent: 'アジア' },
        { name: '川崎フロンターレ', league: 'Jリーグ', country: '日本', continent: 'アジア' },
        { name: '浦和レッズ', league: 'Jリーグ', country: '日本', continent: 'アジア' },
        { name: '鹿島アントラーズ', league: 'Jリーグ', country: '日本', continent: 'アジア' },
        { name: 'ヴィッセル神戸', league: 'Jリーグ', country: '日本', continent: 'アジア' },
        { name: 'FC東京', league: 'Jリーグ', country: '日本', continent: 'アジア' },
        { name: 'サンフレッチェ広島', league: 'Jリーグ', country: '日本', continent: 'アジア' },
        { name: 'セレッソ大阪', league: 'Jリーグ', country: '日本', continent: 'アジア' },
        { name: 'ガンバ大阪', league: 'Jリーグ', country: '日本', continent: 'アジア' },
        { name: '名古屋グランパス', league: 'Jリーグ', country: '日本', continent: 'アジア' },

        { name: 'ユヴェントス', league: 'セリエA', country: 'イタリア', continent: 'ヨーロッパ' },
        { name: 'ACミラン', league: 'セリエA', country: 'イタリア', continent: 'ヨーロッパ' },
        { name: 'インテル・ミラノ', league: 'セリエA', country: 'イタリア', continent: 'ヨーロッパ' },
        { name: 'ASローマ', league: 'セリエA', country: 'イタリア', continent: 'ヨーロッパ' },
        { name: 'SSナポリ', league: 'セリエA', country: 'イタリア', continent: 'ヨーロッパ' },
        { name: 'ラツィオ', league: 'セリエA', country: 'イタリア', continent: 'ヨーロッパ' },
        { name: 'フィオレンティーナ', league: 'セリエA', country: 'イタリア', continent: 'ヨーロッパ' },
        { name: 'アタランタ', league: 'セリエA', country: 'イタリア', continent: 'ヨーロッパ' },

        { name: 'バイエルン・ミュンヘン', league: 'ブンデスリーガ', country: 'ドイツ', continent: 'ヨーロッパ' },
        { name: 'ボルシア・ドルトムント', league: 'ブンデスリーガ', country: 'ドイツ', continent: 'ヨーロッパ' },
        { name: 'RBライプツィヒ', league: 'ブンデスリーガ', country: 'ドイツ', continent: 'ヨーロッパ' },
        { name: 'バイエル・レバークーゼン', league: 'ブンデスリーガ', country: 'ドイツ', continent: 'ヨーロッパ' },
        { name: 'アイントラハト・フランクフルト', league: 'ブンデスリーガ', country: 'ドイツ', continent: 'ヨーロッパ' },
        { name: 'ボルシアMグラードバッハ', league: 'ブンデスリーガ', country: 'ドイツ', continent: 'ヨーロッパ' },

        { name: 'パリ・サンジェルマン', league: 'リーグアン', country: 'フランス', continent: 'ヨーロッパ' },
        { name: 'オリンピック・マルセイユ', league: 'リーグアン', country: 'フランス', continent: 'ヨーロッパ' },
        { name: 'ASモナコ', league: 'リーグアン', country: 'フランス', continent: 'ヨーロッパ' },
        { name: 'オリンピック・リヨン', league: 'リーグアン', country: 'フランス', continent: 'ヨーロッパ' },
        { name: 'LOSCリール', league: 'リーグアン', country: 'フランス', continent: 'ヨーロッパ' },
        { name: 'スタッド・レンヌ', league: 'リーグアン', country: 'フランス', continent: 'ヨーロッパ' }
    ];

    // 国旗はUnicodeの国旗絵文字です。古いOS/ブラウザでは正しく表示されない場合があります。
    var NATIONALITIES = [
        { name: '日本', continent: 'アジア', flag: '🇯🇵' },
        { name: '韓国', continent: 'アジア', flag: '🇰🇷' },
        { name: '中国', continent: 'アジア', flag: '🇨🇳' },
        { name: 'サウジアラビア', continent: 'アジア', flag: '🇸🇦' },
        { name: 'イラン', continent: 'アジア', flag: '🇮🇷' },
        { name: 'カタール', continent: 'アジア', flag: '🇶🇦' },
        { name: 'アラブ首長国連邦', continent: 'アジア', flag: '🇦🇪' },

        { name: 'イングランド', continent: 'ヨーロッパ', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
        { name: 'スコットランド', continent: 'ヨーロッパ', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
        { name: 'ウェールズ', continent: 'ヨーロッパ', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
        { name: 'アイルランド', continent: 'ヨーロッパ', flag: '🇮🇪' },
        { name: 'スペイン', continent: 'ヨーロッパ', flag: '🇪🇸' },
        { name: 'ポルトガル', continent: 'ヨーロッパ', flag: '🇵🇹' },
        { name: 'ドイツ', continent: 'ヨーロッパ', flag: '🇩🇪' },
        { name: 'イタリア', continent: 'ヨーロッパ', flag: '🇮🇹' },
        { name: 'フランス', continent: 'ヨーロッパ', flag: '🇫🇷' },
        { name: 'オランダ', continent: 'ヨーロッパ', flag: '🇳🇱' },
        { name: 'ベルギー', continent: 'ヨーロッパ', flag: '🇧🇪' },
        { name: 'クロアチア', continent: 'ヨーロッパ', flag: '🇭🇷' },
        { name: 'セルビア', continent: 'ヨーロッパ', flag: '🇷🇸' },
        { name: 'ポーランド', continent: 'ヨーロッパ', flag: '🇵🇱' },
        { name: 'ウクライナ', continent: 'ヨーロッパ', flag: '🇺🇦' },
        { name: 'スイス', continent: 'ヨーロッパ', flag: '🇨🇭' },
        { name: 'オーストリア', continent: 'ヨーロッパ', flag: '🇦🇹' },
        { name: 'デンマーク', continent: 'ヨーロッパ', flag: '🇩🇰' },
        { name: 'スウェーデン', continent: 'ヨーロッパ', flag: '🇸🇪' },
        { name: 'ノルウェー', continent: 'ヨーロッパ', flag: '🇳🇴' },
        { name: 'トルコ', continent: 'ヨーロッパ', flag: '🇹🇷' },
        { name: 'ギリシャ', continent: 'ヨーロッパ', flag: '🇬🇷' },

        { name: 'ブラジル', continent: '南米', flag: '🇧🇷' },
        { name: 'アルゼンチン', continent: '南米', flag: '🇦🇷' },
        { name: 'ウルグアイ', continent: '南米', flag: '🇺🇾' },
        { name: 'コロンビア', continent: '南米', flag: '🇨🇴' },
        { name: 'エクアドル', continent: '南米', flag: '🇪🇨' },
        { name: 'チリ', continent: '南米', flag: '🇨🇱' },
        { name: 'パラグアイ', continent: '南米', flag: '🇵🇾' },
        { name: 'ペルー', continent: '南米', flag: '🇵🇪' },

        { name: 'アメリカ', continent: '北中米', flag: '🇺🇸' },
        { name: 'カナダ', continent: '北中米', flag: '🇨🇦' },
        { name: 'メキシコ', continent: '北中米', flag: '🇲🇽' },

        { name: 'モロッコ', continent: 'アフリカ', flag: '🇲🇦' },
        { name: 'アルジェリア', continent: 'アフリカ', flag: '🇩🇿' },
        { name: 'チュニジア', continent: 'アフリカ', flag: '🇹🇳' },
        { name: 'エジプト', continent: 'アフリカ', flag: '🇪🇬' },
        { name: 'セネガル', continent: 'アフリカ', flag: '🇸🇳' },
        { name: 'ナイジェリア', continent: 'アフリカ', flag: '🇳🇬' },
        { name: 'カメルーン', continent: 'アフリカ', flag: '🇨🇲' },
        { name: 'コートジボワール', continent: 'アフリカ', flag: '🇨🇮' },
        { name: 'ガーナ', continent: 'アフリカ', flag: '🇬🇭' },
        { name: '南アフリカ', continent: 'アフリカ', flag: '🇿🇦' },

        { name: 'オーストラリア', continent: 'オセアニア', flag: '🇦🇺' }
    ];

    var CONTINENTS_CLUB = ['ヨーロッパ', 'アジア', '南米', '北中米', 'アフリカ', 'オセアニア'];
    var CONTINENTS_NATIONALITY = ['アジア', 'ヨーロッパ', '南米', '北中米', 'アフリカ', 'オセアニア'];

    global.GegenPressClubsData = {
        CLUBS: CLUBS,
        NATIONALITIES: NATIONALITIES,
        CONTINENTS_CLUB: CONTINENTS_CLUB,
        CONTINENTS_NATIONALITY: CONTINENTS_NATIONALITY
    };
})(window);
