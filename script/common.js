/*
Copyright (c) 2019 takisai
Released under the MIT license
https://opensource.org/licenses/mit-license.php
*/
'use strict';
const VERSION = [0, 9, 4]; // VERSION :: [VersionNumber]

// dgebi :: IDString -> Maybe Element
const dgebi = id => document.getElementById(id);

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
        const isOpen = spanElements[i].hasAttribute('open'); // isOpen :: Bool
        // isClosed :: Bool
        const isClosed = spanElements[i].hasAttribute('closed');
        if(isOpen || isClosed) {
            ret.push(spanElements[i]);
        }
    }
    return ret;
})();

dsElements.forEach(x => x.setAttribute('onclick', 'detailsToggle(this)'));

dgebi('common_info').innerHTML =
        `<ul><li>最新版: Version ${VERSION.join('.')} | 2019-11-10</li><li>製作者: takisai</li><li>動作確認ブラウザ: Google Chrome・Mozilla Firefox・Microsoft Edge 各最新版</li></ul>`;
