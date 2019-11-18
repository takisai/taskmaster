/*
Copyright (c) 2019 takisai
Released under the MIT license
https://opensource.org/licenses/mit-license.php
*/
'use strict';
const VERSION = [0, 10, 1]; // VERSION :: [VersionNumber]

// dgebi :: IDString -> Maybe Element
const dgebi = id => document.getElementById(id);
// parseInt10 :: String -> Maybe Number
const parseInt10 = str => parseInt(str, 10);

// *** polyfill ***
if (!Array.prototype.flat) {
    Array.prototype.flat = function(depth) {
        depth = Math.floor(depth);
        // flat :: ([Array], Number) -> [Array]
        const flat = (array, dep) => {
            const ret = []; // ret :: [Array]
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

// dsElements :: [Elements]
const dsElements = (() => {
    // spanElements :: [Element]
    const spanElements = document.getElementsByTagName('span');
    const ret = []; // ret :: [Elements]
    for(let i = 0; i < spanElements.length; i++) { // i :: IndexNumber
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

do {
    // data :: [String]
    const data = [
        `最新版: Version ${VERSION.join('.')} | 2019-11-18`,
        '製作者: takisai',
        '動作確認ブラウザ: Google Chrome・Mozilla Firefox・Microsoft Edge 各最新版'
    ];
    // html :: DOMString
    const html = `<ul>${data.map(x => `<li>${x}</li>`).join('')}</ul>`;
    dgebi('common_info').innerHTML = html;
} while(false);
