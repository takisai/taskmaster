/*
Copyright (c) 2019 takisai
Released under the MIT license
https://opensource.org/licenses/mit-license.php
*/
'use strict';

[...document.getElementsByTagName('div')].forEach(it => {
    // isIndexId :: Element -> Bool
    const isIndexId = element => /^index_/.test(element.id);
    if(!isIndexId(it)) return;
    // makeUlId :: Element -> String
    const makeUlId = element => `navigation_${element.id.slice(6)}`;
    // parentNavigation :: Element
    const parentNavigation = (() => {
        // f :: Element -> Element
        const f = element => {
            // parent :: Element
            const parent = element.parentNode;
            if(parent.id === 'document') {
                return dgebi('navigation');
            } else if(isIndexId(parent)) {
                return dgebi(makeUlId(parent));
            } else {
                return f(parent);
            }
        };
        return f(it);
    })();
    // index :: String
    const index = (() => {
        // num :: Number
        const num = parentNavigation.children.length / 2 + 1;
        if(parentNavigation.id === 'navigation') {
            return String(num);
        } else {
            // text :: String
            const text = parentNavigation.previousElementSibling.innerText;
            return `${text.split(' ')[0]}.${num}`;
        }
    })();
    it.children[0].innerText = `${index} ${it.children[0].innerText}`;
    // liELement :: Element
    const liElement = document.createElement('li');
    liElement.innerHTML = (() => {
        // text :: String
        const text = it.children[0].innerText;
        return makeTagString('a', {href: `#${it.id}`}, text);
    })();
    parentNavigation.appendChild(liElement);

    // ulELement :: Element
    const ulElement = document.createElement('ul');
    ulElement.setAttribute('id', makeUlId(it));
    parentNavigation.appendChild(ulElement);
});

[...document.getElementsByTagName('a')].forEach(it => {
    if(it.innerText !== 'here') return;
    // href :: String
    const href = it.getAttribute('href');
    if(href[0] !== '#') return;
    it.innerText = dgebi(href.slice(1)).children[0].innerText.split(' ')[0];
});
