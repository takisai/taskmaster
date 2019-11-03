/*
Copyright (c) 2019 takisai
Released under the MIT license
https://opensource.org/licenses/mit-license.php
*/
'use strict';

{
    // userAgent :: String
    const userAgent = window.navigator.userAgent.toLowerCase();
    // isTrident :: Bool
    const isTrident = userAgent.indexOf('trident') !== -1;
    const isMsie = userAgent.indexOf('msie') !== -1; // isMsie :: Bool
    if(isTrident || isMsie) {
        window.alert('Task MasterはInternet Explorer非対応です');
    }
}
