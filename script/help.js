/*
Copyright (c) 2019 takisai
Released under the MIT license
https://opensource.org/licenses/mit-license.php
*/
'use strict';

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
const aElements = document.getElementsByTagName('a'); // aElements :: [Element]
for(let i = 0; i < aElements.length; i++) { // i :: IndexNumber
    const link = aElements[i].getAttribute('href'); // link :: LinkString
    if(!/^#/.test(link)) continue;
    aElements[i].setAttribute('onclick', `hrefOpen('${link.slice(1)}')`);
    aElements[i].setAttribute('href', 'javascript:void(0)');
}

const separator = '|'; // separator :: String
dsElements.forEach(x => x.addEventListener('click', () => {
    let ret = [VERSION.join('.')];
    dsElements.forEach(t => ret.push(t.hasAttribute('open')));
    window.localStorage.setItem('help', ret.join(separator));
}));

// data :: [LoadString]
const data = window.localStorage.getItem('help').split(separator);
// version :: [VersionNumber]
const version = data.shift().split('\.').map(x => parseInt(x, 10));
if(!(version < VERSION || version > VERSION)) {
    for(let i = 0; i < dsElements.length; i++) { // i :: IndexNumber
        const hasOpen = dsElements[i].hasAttribute('open'); // hasOpen :: Bool
        // hasClosed :: Bool
        const hasClosed = dsElements[i].hasAttribute('closed');
        if(data[i] === 'true' && hasClosed || data[i] === 'false' && hasOpen) {
            detailsToggle(dsElements[i]);
        }
    }
}
