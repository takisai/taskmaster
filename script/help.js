/*
Copyright (c) 2019 takisai
Released under the MIT license
https://opensource.org/licenses/mit-license.php
*/
'use strict';

const SEPARATOR = '|'; // SEPARATOR :: String

// hrefOpen :: String -> ()
const hrefOpen = id => {
    let target = dgebi(id); // target :: Maybe Element
    if(target === null) return;
    while(target !== null) {
        const firstChild = target.children[0]; // firstChild :: Element
        if(firstChild.hasAttribute('closed')) {
            detailsToggle(firstChild);
        }
        target = target.parentNode;
    }
    window.location.href = '#' + id;
};

do {
    // aElements :: [Element]
    const aElements = document.getElementsByTagName('a');
    for(let i = 0; i < aElements.length; i++) { // i :: NaturalNumber
        const link = aElements[i].getAttribute('href'); // link :: String
        if(!/^#/.test(link)) continue;
        aElements[i].setAttribute('onclick', `hrefOpen('${link.slice(1)}')`);
        aElements[i].setAttribute('href', 'javascript:void(0)');
    }
} while(false);

dsElements.forEach(x => x.addEventListener('click', () => {
    const ret = [VERSION.join('.')]; // ret :: [String]
    dsElements.forEach(t => ret.push(t.hasAttribute('open')));
    window.localStorage.setItem('help', ret.join(SEPARATOR));
}));

do {
    // data :: [String]
    const data = window.localStorage.getItem('help').split(SEPARATOR);
    if(data === undefined) break;
    // version :: [NaturalNumber]
    const version = data.shift().split('\.').map(x => parseInt10(x));
    if(!(version < VERSION || version > VERSION)) {
        for(let i = 0; i < dsElements.length; i++) { // i :: NaturalNumber
            // hasOpen :: Bool;  hasClosed :: Bool
            const hasOpen = dsElements[i].hasAttribute('open');
            const hasClosed = dsElements[i].hasAttribute('closed');
            const isTrue = data[i] === 'true'; // isTrue :: Bool
            const isFalse = data[i] === 'false'; // isFalse :: Bool
            if(isTrue && hasClosed || isFalse && hasOpen) {
                detailsToggle(dsElements[i]);
            }
        }
    }
} while(false);
