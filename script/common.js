/*
Copyright (c) 2019 takisai
Released under the MIT license
https://opensource.org/licenses/mit-license.php
*/
'use strict';
const VERSION = [0, 9, 2]; // VERSION :: [VersionNumber]

// dgebi :: IDString -> Maybe Element
const dgebi = id => document.getElementById(id);

const detailsToggle = target => {
    if(target.hasAttribute('open')) {
        target.removeAttribute('open');
        target.setAttribute('closed', '');
    } else {
        target.removeAttribute('closed');
        target.setAttribute('open', '');
    }
};

// spanElements :: [Element]
const spanElements = document.getElementsByTagName('span');
const dsElements = []; // dsElements :: [Elements]
for(let i = 0; i < spanElements.length; i++) { // i :: IndexNumber
    const isOpen = spanElements[i].hasAttribute('open'); // isOpen :: Bool
    const isClosed = spanElements[i].hasAttribute('closed'); // isClosed :: Bool
    if(isOpen || isClosed) {
        dsElements.push(spanElements[i]);
    }
}
dsElements.forEach(x => x.setAttribute('onclick', 'detailsToggle(this)'));

dgebi('common_info').innerHTML =
        `<ul><li>最新版: Version ${VERSION.join('.')} | 2019-11-03</li><li>製作者: takisai</li><li>動作確認環境: Chrome・Firefox</li></ul>`;