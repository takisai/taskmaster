/*
Copyright (c) 2019 takisai
Released under the MIT license
https://opensource.org/licenses/mit-license.php
*/
'use strict';

const SEPARATOR = '|'; // SEPARATOR :: String

// hrefOpen :: IDString -> ()
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

{
    // aElements :: [Element]
    const aElements = document.getElementsByTagName('a');
    for(let i = 0; i < aElements.length; i++) { // i :: IndexNumber
        const link = aElements[i].getAttribute('href'); // link :: LinkString
        if(!/^#/.test(link)) continue;
        aElements[i].setAttribute('onclick', `hrefOpen('${link.slice(1)}')`);
        aElements[i].setAttribute('href', 'javascript:void(0)');
    }
}

dsElements.forEach(x => x.addEventListener('click', () => {
    let ret = [VERSION.join('.')];
    dsElements.forEach(t => ret.push(t.hasAttribute('open')));
    window.localStorage.setItem('help', ret.join(SEPARATOR));
}));

{
    // data :: [LoadString]
    const data = window.localStorage.getItem('help').split(SEPARATOR);
    // version :: [VersionNumber]
    const version = data.shift().split('\.').map(x => parseInt(x, 10));
    if(!(version < VERSION || version > VERSION)) {
        for(let i = 0; i < dsElements.length; i++) { // i :: IndexNumber
            // hasOpen :: Bool
            const hasOpen = dsElements[i].hasAttribute('open');
            // hasClosed :: Bool
            const hasClosed = dsElements[i].hasAttribute('closed');
            const isTrue = data[i] === 'true'; // isTrue :: Bool
            const isFalse = data[i] === 'false'; // isFalse :: Bool
            if(isTrue && hasClosed || isFalse && hasOpen) {
                detailsToggle(dsElements[i]);
            }
        }
    }
}
