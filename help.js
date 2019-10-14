/*
Copyright (c) 2019 takisai
Released under the MIT license
https://opensource.org/licenses/mit-license.php
*/
'use strict';
const VERSION = [0, 8, 0]; // VERSION :: [VersionNumber]

// dgebi :: IDString -> Maybe Element
const dgebi = id => document.getElementById(id);

// hrefOpen :: IDString -> ()
const hrefOpen = id => {
    let target = dgebi(id); // target :: Maybe Element
    if(target === null) return;
    while(target !== null) {
        if(target.tagName === 'DETAILS') {
            target.open = true;
        }
        target = target.parentNode;
    }
    window.location.href = '#' + id;
};
const aElements = document.getElementsByTagName('a'); // aElements :: [Element]
for(let i = 0; i < aElements.length; i++) { // i :: IndexNumber
    const link = aElements[i].getAttribute('href'); // link :: LinkString
    if(!/^#/.test(link)) continue;
    aElements[i].setAttribute('onclick', `hrefOpen('${link.slice(1)}')`);
    aElements[i].setAttribute('href', 'javascript:void(0)');
}

const separator = '|'; // separator :: String
// detailsElements :: [Element]
const detailsElements = document.getElementsByTagName('details');
for(let i = 0; i < detailsElements.length; i++) { // i :: IndexNumber
    detailsElements[i].addEventListener('toggle', () => {
        let ret = [VERSION.join('.')];
        for(let i = 0; i < detailsElements.length; i++) { // i :: IndexNumber
            ret.push(detailsElements[i].open);
        }
        window.localStorage.setItem('help', ret.join(separator));
    });
}
// data :: [LoadString]
const data = window.localStorage.getItem('help').split(separator);
// version :: [VersionNumber]
const version = data.shift().split('\.').map(x => parseInt(x, 10));
if(!(version < VERSION || version > VERSION)) {
    for(let i = 0; i < detailsElements.length; i++) { // i :: IndexNumber
        detailsElements[i].open = data[i] === 'true';
    }
}
