/*
Copyright (c) 2019 takisai
Released under the MIT license
https://opensource.org/licenses/mit-license.php
*/
'use strict';

// *** polyfill ***
if(Array.prototype.flat === undefined) {
    Array.prototype.flat = function(depth) {
        depth = Math.floor(depth);
        // flat :: ([Object], NaturalNumber) -> [Object]
        const flat = (array, dep) => {
            const ret = []; // ret :: [Object]
            array.forEach(x => {
                if(Array.isArray(x) && dep > 0) {
                    ret.push(...flat(x, dep - 1));
                } else {
                    ret.push(x);
                }
            });
            return ret;
        };
        return flat(this, isNaN(depth) || depth === 0 ? 1 : depth);
    };
}

// dgebi :: String -> Maybe Element
const dgebi = id => document.getElementById(id);
// parseInt10 :: Maybe String -> Maybe IntegerNumber
const parseInt10 = str => parseInt(str, 10);

// VERSION :: [NaturalNumber]
const VERSION = (() => {
    // historyInfo :: [Object]
    const historyInfo = [
        {
            version: [0, 10, 10],
            date: '2019-12-30',
            info: [
                '空白だけの文字列を履歴に残さないよう修正',
                'エラー表示に関する不具合を修正'
            ]
        },
        {
            version: [0, 10, 9],
            date: '2019-12-27',
            info: [
                'ログのエラー表示を変更',
                'エスケープ処理の不具合を修正',
                '<kbd>remove-tag</kbd>のエラー表示を修正'
            ]
        },
        {
            version: [0, 10, 8],
            date: '2019-12-21',
            info: [
                'エラー表示などを選択中のとき消さないよう変更',
                '上下キーでコマンドを出したときenterボタンが出ない不具合を修正'
            ]
        },
        {
            version: [0, 10, 7],
            date: '2019-12-17',
            info: [
                'エラー表示などを長く残すよう変更',
                'パラメーターの*指定のバグを修正'
            ]
        },
        {
            version: [0, 10, 6],
            date: '2019-12-16',
            info: [
                'エラー表示などをログに表示するよう変更',
                'loadとミュートに関するバグを修正'
            ]
        },
        {
            version: [0, 10, 5],
            date: '2019-12-08',
            info: [
                'ミュートにしたときの画面の表示の不具合を修正',
                'helpページでエラーが出ないよう修正',
                '画面表示を微調整'
            ]
        },
        {
            version: [0, 10, 4],
            date: '2019-12-01',
            info: [
                '<kbd>help</kbd>コマンドが複数回呼ばれないよう修正',
                'パラメーターのバグを修正',
                'エラー表示を調整'
            ]
        },
        {
            version: [0, 10, 3],
            date: '2019-11-28',
            info: [
                'ショートカットキーの不具合を修正',
                '<kbd>merge</kbd>コマンドのバグを修正'
            ]
        },
        {
            version: [0, 10, 2],
            date: '2019-11-24',
            info: [
                '設定時刻後のリマインダーの表示を変更',
                '<kbd>merge</kbd>コマンドのバグを修正',
                '文字選択時に影が出ないよう修正',
                '色味を修正'
            ]
        },
        {
            version: [0, 10, 1],
            date: '2019-11-18',
            info: [
                'ラジオボタンのラベルの不具合を修正',
                'ミュート状態の表示を修正',
                '設定時刻後のリマインダーの表示を修正',
                'バージョン管理のバグを修正'
            ]
        },
        {
            version: [0, 10, 0],
            date: '2019-11-17',
            info: [
                '<kbd>mute</kbd>コマンドの追加',
                '<kbd>toggle-tag</kbd>コマンドなどの追加',
                '<kbd>save</kbd>コマンドの仕様変更',
                'リマインダーリストの時刻表示を押すことで<kbd>switch</kbd>コマンドを呼び出すよう修正',
                'タグの削除時のバグを修正'
            ]
        },
        {
            version: [0, 9, 5],
            date: '2019-11-16',
            info: [
                '<kbd>remove</kbd>コマンドの不具合を修正',
                '<kbd>move</kbd>コマンドの不具合を修正',
                'helpページでエラーが出ないよう修正'
            ]
        },
        {
            version: [0, 9, 4],
            date: '2019-11-10',
            info: [
                'タグ名部分のアラートが消える不具合を修正',
                '注意事項を追加',
                'helpの文章を微修正'
            ]
        },
        {
            version: [0, 9, 3],
            date: '2019-11-04',
            info: [
                'Edgeで動作するように修正',
                'ボタン登録時の不具合を修正'
            ]
        },
        {
            version: [0, 9, 2],
            date: '2019-11-03',
            info: [
                '開閉可能なアイテムの表示を変更',
                'IEが非対応なことを明記'
            ]
        },
        {
            version: [0, 9, 1],
            date: '2019-10-27',
            info: [
                'タグを設定したリマインダーの動作が正しくなるよう修正',
                'タグの開閉状態を保存する機能を追加',
                'helpを微修正'
            ]
        },
        {
            version: [0, 9, 0],
            date: '2019-10-19',
            info: [
                'enterボタンの追加',
                '<kbd>remove-tag</kbd>コマンドの機能追加',
                '等幅フォントの大きさを調整',
                'タグ間の広さを調整',
                '入力に含まれる空白を減らしすぎないよう修正',
                'ボタン・マクロ・タグの表示順番に関するバグを修正',
                '<kbd>remove-tag</kbd>コマンドの表示のバグを修正',
                'help文章を修正',
                'アクセス時の背景バグの再修正'
            ]
        },
        {
            version: [0, 8, 0],
            date: '2019-10-14',
            info: [
                'アイコンの追加',
                'タイトル画面の追加',
                'タグのあるリマインダーが動作したときの動作を追加',
                'パラメーターのバグを修正',
                'タグの削除に関するバグを修正',
                'GUIによる入力のチェックがより厳しくなるよう修正'
            ]
        },
        {
            version: [0, 7, 0],
            date: '2019-10-12',
            info: [
                '<kbd>tag</kbd>、<kbd>remove-tag</kbd>、<kbd>move</kbd>の追加',
                '<kbd>remove</kbd>の仕様変更',
                '音番号の変更',
                '入力に含まれる空白を減らすよう変更',
                'パラメーターの範囲チェック不具合を修正',
                'ボタンにマウスオーバーするとボタン番号がtipで出るように修正',
                'helpの文章を大幅に修正',
                'アクセス時の背景バグの再修正'
            ]
        },
        {
            version: [0, 6, 0],
            date: '2019-09-10',
            info: [
                '<kbd>merge</kbd>の追加',
                '音を変更',
                '背景が赤いときにページを読み込むときに発生するバグを修正',
                'ヘルプの内容を追加'
            ]
        },
        {
            version: [0, 5, 1],
            date: '2019-09-01',
            info: [
                'ヘルプの内容を追加',
                'ヘルプページの開閉状態を保存するように変更'
            ]
        },
        {
            version: [0, 5, 0],
            date: '2019-08-25',
            info: [
                '<kbd>remove</kbd>などのコマンドで範囲指定ができるように変更'
            ]
        },
        {
            version: [0, 4, 3],
            date: '2019-08-22',
            info: [
                'ボタンを押しても入力欄にフォーカスが当たるように変更',
                'volumeバーの上の空間が小さくなるよう修正',
                '推薦環境を動作確認環境に言い換え',
                'ソースコードにコメントを追加'
            ]
        },
        {
            version: [0, 4, 2],
            date: '2019-08-19',
            info: [
                '背景が赤くなるときヘッダーの色が変わらない不具合を修正'
            ]
        },
        {
            version: [0, 4, 1],
            date: '2019-08-18',
            info: [
                '音番号を10以降も指定できるように変更',
                'historyの挙動を修正',
                'タイマーの表示を修正',
                'ヘルプの文章を修正'
            ]
        },
        {
            version: [0, 4, 0],
            date: '2019-08-12',
            info: [
                '<kbd>default s</kbd>の追加',
                '新しいバージョンになったときに通知する機能を追加',
                '時刻・テキスト入力欄・ボタンが画面上部に固定されるように変更',
                'アイテムの表示順を変更',
                'メニューの表示崩れを修正',
                'shiftキーを押してもショートカットが動作する不具合を修正'
            ]
        },
        {
            version: [0, 3, 3],
            date: '2019-08-09',
            info: [
                '<kbd>+</kbd>でつないだリマインダーの時刻表示が1秒前後ずれる不具合を修正',
                'リマインダー設定の入力チェックを追加',
                'リマインダー設定の既定値を<kbd>default</kbd>の値に変更',
                '<kbd>default</kbd>の仕様変更'
            ]
        },
        {
            version: [0, 3, 2],
            date: '2019-08-06',
            info: [
                '以前の履歴が候補として表示されるのを非表示に',
                '<kbd>+</kbd>でつないだリマインダーの時刻表示が1秒早く見える不具合を修正',
                'リマインダー設定のスタイルを微修正',
                'ヘルプのアンカーが正しく働くようにスクリプトを導入'
            ]
        },
        {
            version: [0, 3, 1],
            date: '2019-08-04',
            info: [
                '<kbd>load</kbd>コマンドの不具合を修正',
                'ヘルプのリンク切れを修正'
            ]
        },
        {
            version: [0, 3, 0],
            date: '2019-08-03',
            info: [
                '<kbd>switch</kbd>の変更',
                '<kbd>switch-alarm</kbd>/<kbd>switch-timer</kbd>の追加',
                'コマンドのエラーをより正確に出すように修正'
            ]
        },
        {
            version: [0, 2, 0],
            date: '2019-08-02',
            info: [
                '<kbd>help</kbd>の追加',
                'リマインダー動作時にコマンドを実行する書式を変更',
                'アラーム指定のmilliseconds単位のズレを修正',
                'リマインダー指定で不正な入力をした場合の動作を修正',
                '<kbd>remove</kbd>で消したリマインダーが<kbd>undo</kbd>で復元できない不具合を修正',
                '上キーで入力位置が始めになる不具合を修正',
                'スマホでの表示幅を既定値から変更',
                '時計のフォントの不具合を修正',
                'autocompleteで以前の入力が出ないよう修正'
            ]
        },
        {
            version: [0, 1, 0],
            date: '2019-08-01',
            info: [
                'β版'
            ]
        }
    ];
    // makeUnorderedList :: [String] -> String
    const makeUnorderedList = list => {
        return `<ul>${list.map(x => `<li>${x}</li>`).join('')}</ul>`;
    };

    const ret = historyInfo[0].version; // ret :: [NaturalNumber]
    // commonInfo :: [String]
    const commonInfo = [
        `最新版: Version ${ret.join('.')} | ${historyInfo[0].date}`,
        '製作者: takisai',
        '動作確認ブラウザ: Google Chrome・Mozilla Firefox・Microsoft Edge 各最新版'
    ];
    dgebi('common_info').innerHTML = makeUnorderedList(commonInfo);

    const target = dgebi('history_info'); // target :: Maybe Element
    if(target !== null) {
        // items :: [String]
        const items = historyInfo.map(x => {
            const info = makeUnorderedList(x.info); // info :: String
            return `Version ${x.version.join('.')} | ${x.date}${info}`;
        });
        target.innerHTML = makeUnorderedList(items);
    }

    return ret;
})();

// detailsToggle :: Element -> ()
const detailsToggle = target => {
    if(target.hasAttribute('open')) {
        target.removeAttribute('open');
        target.setAttribute('closed', '');
    } else { // target.hasAttribute('closed')
        target.removeAttribute('closed');
        target.setAttribute('open', '');
    }
};

// dsElements :: [Element]
const dsElements = (() => {
    // spanElements :: [Element]
    const spanElements = document.getElementsByTagName('span');
    const ret = []; // ret :: [Element]
    for(let i = 0; i < spanElements.length; i++) { // i :: NaturalNumber
        // isOpen :: Bool;  isClosed :: Bool
        const isOpen = spanElements[i].hasAttribute('open');
        const isClosed = spanElements[i].hasAttribute('closed');
        if(isOpen || isClosed) {
            ret.push(spanElements[i]);
        }
    }
    return ret;
})();

dsElements.forEach(x => x.setAttribute('onclick', 'detailsToggle(this)'));
