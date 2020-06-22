/*
Copyright (c) 2019 takisai
Released under the MIT license
https://opensource.org/licenses/mit-license.php
*/
'use strict';
const UPDATE_TIME = 200; // UPDATE_TIME :: DateNumber
const SEPARATOR = '\v'; // SEPARATOR :: String
const NOTICE_CLEAR_TIME = 5000; // NOTICE_CLEAR_TIME :: DateNumber
const RECURSION_LIMIT = 5; // RECURSION_LIMIT :: NaturalNumber
const AUTO_REMOVE_TIME = 15000; // AUTO_REMOVE_TIME :: DateNumber

const NUMBER_OF_SOUNDS = 15; // NUMBER_OF_SOUNDS :: NaturalNumber
/*  NUMBER_OF_SOUNDSの数だけmp3ファイルを登録して音を鳴らすことができます。
    このファイルと同じフォルダーにあるsoundフォルダー内に、
    "alarm<数値>.mp3"という名前のmp3ファイル用意してください。
    <数値>は0からNUMBER_OF_SOUNDS-1までの数値です。 */

// makeClockStr :: [Number] -> String
const makeClockStr = nums => {
    return nums.map(x => String(Math.floor(x)).padStart(2, '0')).join(':');
};

// toHms :: Date -> String
const toHms = obj => {
    return makeClockStr([obj.getHours(), obj.getMinutes(), obj.getSeconds()]);
}

// removeDom :: String -> Bool
const removeDom = id => {
    const target = dgebi(id); // target :: Maybe Element
    if(target === null) return false;
    offsetManage(() => {
        target.parentNode.removeChild(target);
    });
    return true;
};

// htmlEscape :: String -> String
const htmlEscape = str => {
    return str.replace(/&/g, '&amp;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#27;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/`/g, '&#60;');
};

// quotEscape :: String -> String
const quotEscape = str => {
    return str.replace(/\\/g, '\\\\')
              .replace(/"/g, '\"')
              .replace(/'/g, '\'')
              .replace(/`/g, '\`');
};

// makeErrorDom :: String -> String
const makeErrorDom = str => `<span class="color_red">${str}</span>`;

// getText :: () -> ()
const getText = () => {
    const input = document.cui_form.input.value; // input :: String
    document.cui_form.input.value = '';
    submitButtonControl();
    History.push(input);
    parseMain(input);
};

// getByGui :: () -> ()
const getByGui = () => {
    const form = document.gui_form; // form :: Element
    const timeUnit = ['hour', 'minute', 'second']; // timeUnit :: [String]
    const ret = []; // [String]
    // error :: () -> ()
    const error = () => {
        Notice.clear();
        Notice.set('適切でない入力です');
        return;
    };
    // isValid :: (String -> Bool, [String]) -> Bool
    const isValid = (func, strs) => {
        if(!strs.some(x => func(x) || Number(x) < 0)) return true;
        error();
        return false;
    };
    // makeMode :: String -> String
    const makeMode = flag => {
        return form.gui_sound.value + flag + form.gui_importance.value;
    };

    if(form.task_type.value === 'timer') {
        const unit = ['h', 'm', 's']; // unit :: [String]
        // value :: [String]
        const value = timeUnit.map(x => form['timer_' + x].value);
        if(!isValid(x => isNaN(Number(x)), value)) return;
        // main :: String
        const main = [0, 1, 2].map(i => Number(value[i]) + unit[i]).join('');
        ret.push(main, makeMode('t'));
    } else { // form.task_type.value === 'alarm'
        // value :: [String]
        const value = timeUnit.map(x => form['alarm_' + x].value);
        if(!isValid(x => !/^\d*$/.test(x), value)) return;
        ret.push(value.map(x => parseInt10(x)).join(':'), makeMode('a'));
    }
    if(form.gui_text.value !== '') {
        if(/;|->/.test(form.gui_text.value)) {
            error();
            return;
        }
        ret.push(form.gui_text.value);
    }
    parseMain(ret.join('/'));
};

// parseMain :: (String, String) -> ()
const parseMain = (() => {
    let idCount = 0; // idCount :: NaturalNumber
    let recursionCount = 0; // recursionCount :: NaturalNumber
    let isHelpCall = false; // isHelpCall :: Bool

    // evaluate :: String -> String
    const evaluate = str => {
        // safeEval :: Maybe String -> String
        const safeEval = str => {
            try {
                return String(Function(`'use strict';return(${str})`)());
            } catch(e) {
                return '';
            }
        };
        const ret = []; // ret :: [String]
        while(str !== '') {
            // result :: Maybe [Maybe String]
            const result = /^(.*?)(\$\{(.*?)\$\}(.*))?$/.exec(str);
            ret.push(result[1]);
            if(result[2] === undefined) break;
            ret.push(safeEval(result[3]));
            str = result[4];
        }
        return ret.join('');
    };
    // play :: (String, String) -> ()
    const play = (parameter, callFrom) => {
        if(!/^\d+$/.test(parameter)) {
            if(parameter === '-') return;
            Notice.set('error: sound ' + makeErrorDom(parameter));
            return;
        }
        Sound.play(`sound/alarm${parameter - 1}.mp3`, callFrom);
    }

    // main :: (String, String) -> ()
    const main = (text, callFrom) => {
        text = text.replace(/\s+/g, ' ');
        const isHeadHash = /^#/.test(text); // isHeadHash :: Bool
        const isHeadArrow = /^->/.test(text); // isHeadArrow :: Bool
        const isRawMode = isHeadHash || isHeadArrow; // isRawMode :: Bool
        if(isHeadHash) {
            text = text.slice(1);
        }
        if(Macro.isInsertSuccess(text)) return;
        text = text.trim();
        if(!isRawMode) {
            text = Macro.replace(text);
            text = evaluate(text);
        }
        if(text === '') return;
        if(!isHeadArrow) {
            const texts = text.split(';'); // texts :: [String]
            if(texts.length > 1) {
                recursionCount++;
                if(recursionCount > RECURSION_LIMIT) throw 'too much recursion';
                texts.forEach(element => main(element, callFrom));
                recursionCount--;
                return;
            }
        }
        // spaceSplit :: Maybe [Maybe String]
        const spaceSplit = /^([^ ]*)(?: (.*))?$/.exec(text);
        // console.assert(spaceSplit !== null);
        // parameter :: String
        const parameter = spaceSplit[2] === undefined ? '' : spaceSplit[2];
        switch(callFrom) {
            case 'merge':
                switch(spaceSplit[1]) {
                    case 'show-macro':
                    case 'hide-macro':
                    case 'volume':
                    case 'mute':
                    case 'default':
                    case 'show-menu':
                    case 'hide-menu':
                        return;
                    case '$tag':
                        Tag.insertByData(parameter);
                        return;
                    case '$button':
                        Button.insertByData(parameter);
                        return;
                    case '->':
                        Macro.insertByData(parameter);
                        return;
                }
                break;
            case 'priv':
                switch(spaceSplit[1]) {
                    case '$button':
                        Button.insertByData(parameter);
                        return;
                    case '$tag':
                        Tag.insertByData(parameter);
                        return;
                    case '->':
                        Macro.insertByData(parameter);
                        return;
                }
            default:
                switch(spaceSplit[1]) {
                    case 'switch':
                        TaskQueue.setDisplay(parameter, '', callFrom);
                        return;
                    case 'switch-alarm':
                        TaskQueue.setDisplay(parameter, '-alarm', callFrom);
                        return;
                    case 'switch-timer':
                        TaskQueue.setDisplay(parameter, '-timer', callFrom);
                        return;
                    case 'remove':
                        TaskQueue.remove(parameter, callFrom);
                        return;
                    case 'tag':
                        Tag.insert(parameter);
                        return;
                    case 'remove-tag':
                        Tag.remove(parameter);
                        return;
                    case 'open-tag':
                        Tag.toggle(parameter, 'open');
                        return;
                    case 'close-tag':
                        Tag.toggle(parameter, 'close');
                        return;
                    case 'toggle-tag':
                        Tag.toggle(parameter, 'toggle');
                        return;
                    case 'button':
                        Button.insert(parameter);
                        return
                    case 'remove-button':
                        Button.remove(parameter);
                        return;
                    case 'show-macro':
                        Macro.show();
                        return;
                    case 'hide-macro':
                        Macro.hide();
                        return;
                    case 'remove-macro':
                        Macro.remove(parameter, callFrom);
                        return;
                    case 'sound':
                        play(parameter, callFrom);
                        return;
                    case 'stop':
                        Sound.stop(parameter, callFrom);
                        return;
                    case 'volume':
                        Sound.setVolume(parameter);
                        return;
                    case 'mute-on':
                        Sound.setMute('on');
                        return;
                    case 'mute-off':
                        Sound.setMute('off');
                        return;
                    case 'mute':
                        Sound.setMute('');
                        return;
                    case 'default':
                        Task.setDefault(parameter);
                        return;
                    case 'show-menu':
                        Display.showMenu();
                        return;
                    case 'hide-menu':
                        Display.hideMenu();
                        return;
                    case 'save':
                        Save.toString();
                        return;
                    case 'load':
                        Load.fromString();
                        return;
                    case 'merge':
                        Load.mergeFromString();
                        return;
                    case 'undo':
                        Trash.pop();
                        return;
                    case 'empty-trash':
                        Trash.reset();
                        return;
                    case 'empty-history':
                        History.reset();
                        return;
                    case 'help':
                        if(isHelpCall) return;
                        window.open('help.html', '_blank');
                        isHelpCall = true;
                        return;
                }
                break;
        }
        // moveResult :: Maybe [Maybe String]
        const moveResult = /^move(?:#(.*))?$/.exec(spaceSplit[1]);
        if(moveResult !== null) {
            TaskQueue.move(parameter, moveResult[1]);
            return;
        }
        // taskItem :: Maybe TaskObject
        const taskItem = Task.parse(text, callFrom);
        if(taskItem === null) {
            Notice.set('error: ' + makeErrorDom(text));
            return;
        }
        TaskQueue.insert(taskItem, callFrom);
    };

    return (text, callFrom = 'global') => {
        try {
            Notice.clear();
            isHelpCall = false;
            main(text, callFrom);
        } catch(e) {
            switch(e) {
                case 'too much recursion':
                    Notice.set('too much recursion');
                    break;
                default:
                    Notice.set('unexpected error');
                    console.log(e);
                    break;
            }
        }
        Save.exec();
    };
})();

// showAlarmGUI :: () -> ()
const showAlarmGUI = () => {
    dgebi('label_radio_alarm').style.display = null;
    dgebi('label_radio_alarm').className = '';
    dgebi('alarm_setting').style.display = 'block';
    dgebi('label_radio_timer').className = 'strike';
    dgebi('timer_setting').style.display = 'none';
    dgebi('gui_other_setting').style.display = 'block';
};

// showTimerGUI :: () -> ()
const showTimerGUI = () => {
    dgebi('label_radio_timer').style.display = null;
    dgebi('label_radio_timer').className = '';
    dgebi('timer_setting').style.display = 'block';
    dgebi('label_radio_alarm').className = 'strike';
    dgebi('alarm_setting').style.display = 'none';
    dgebi('gui_other_setting').style.display = 'block';
};

// submitButtonControl :: () -> ()
const submitButtonControl = () => {
    dgebi('cui_submit').style.display = document.cui_form.input.value === ''
            ? 'none'
            : 'inline';
};

const Util = (() => {
    return {
        // Util.insert :: ([Object], Object, Element, String, String) -> ()
        insert: (object, item, element, preId, parentId) => {
            element.setAttribute('id', `${preId}_${item.id}`);
            // i :: NaturalNumber
            const i = object.findIndex(x => x.time > item.time);
            if(i >= 0) {
                // target :: Maybe Element
                const target = dgebi(`${preId}_${object[i].id}`);
                // console.assert(target !== null);
                offsetManage(() => {
                    target.parentNode.insertBefore(element, target);
                });
                object.splice(i, 0, item);
            } else {
                offsetManage(() => {
                    dgebi(parentId).appendChild(element);
                });
                object.push(item);
            }
        },
        /* Util.insertByData ::
                (String, (String, Maybe DateNumber) -> Object) -> () */
        insertByData: (str, func) => {
            // result :: Maybe [Maybe String]
            const result = /^(\d+)#(.*)$/.exec(str);
            // console.assert(result !== null || result[2] !== undefined);
            func(result[2], parseInt10(result[1]));
        },
        // Util.parameterCheck :: (String, NaturalNumber) -> IndexObject
        parameterCheck: (str, max) => {
            // ret :: [Object]
            const ret = str.split(' ').map(x => {
                // errObj :: Object
                const errObj = x === '*'
                        ? {data: [], isErr: false, str: '*'}
                        : {isErr: true, str: makeErrorDom(x)};
                if(x === '*') {
                    x = '1-' + max;
                }
                // rangeResult :: Maybe [Maybe String]
                const rangeResult = /^(\d*)-(\d*)$/.exec(x);
                if(x !== '-' && rangeResult !== null) {
                    // border :: [Maybe NaturalNumber]
                    const border = rangeResult.slice(1).map(t => parseInt10(t));
                    if(border[0] > max || border[1] < 1) return errObj;
                    if(isNaN(border[0]) || border[0] < 1) {
                        border[0] = 1;
                    }
                    if(isNaN(border[1]) || border[1] > max) {
                        border[1] = max;
                    }
                    // ret :: [NaturalNumber]
                    const ret = [...Array(border[1] - border[0] + 1).keys()];
                    return {
                        data: ret.map(t => t + border[0] - 1),
                        isErr: false,
                        str: x
                    };
                }
                const index = parseInt10(x); // index :: Maybe NaturalNumber
                return index > 0 && index <= max && /^\d+$/.test(x)
                        ? {
                            data: [index - 1],
                            isErr: false,
                            str: x
                        }
                        : errObj;
            });
            // nubData :: [Maybe NaturalNumber]
            const nubData = [...new Set(ret.map(x => x.data).flat())];
            return {
                data: nubData.filter(x => x !== undefined),
                isErr: ret.some(x => x.isErr),
                str: ret.map(x => x.str).join(' ')
            };
        },
        /* Util.updateIndex ::
                (String, [NaturalNumber], Element -> Element) -> () */
        updateIndex: (str, ids, func) => {
            ids.forEach((id, i) => func(dgebi(str + id)).title = i + 1);
        }
    };
})();

const BackgroundAlert = (() => {
    let semaphore = 0; // semaphore :: NaturalNumber

    return {
        // BackgroundAlert.up :: () -> ()
        up: () => {
            semaphore++;
            dgebi('body').className = 'background-color_pink';
        },
        // BackgroundAlert.down :: () -> ()
        down: () => {
            if(semaphore > 0) {
                semaphore--;
                if(semaphore > 0) return;
            }
            dgebi('body').className = 'background-color_white';
        }
    };
})();

const History = (() => {
    const strs = []; // strs :: [String]
    let index = 0, tempStr = ''; // index :: NaturalNumber;  tempStr :: String

    return {
        // History.push :: String -> ()
        push: str => {
            if(/^\s*$/.test(str)) return;
            strs.push(str);
            if(index < strs.length - 1 && strs[index] === str) {
                strs.splice(index, 1);
            }
            index = strs.length;
        },
        // History.up :: String -> String
        up: str => {
            if(index === strs.length) {
                tempStr = str;
            }
            if(index === 0) return strs.length === 0 ? tempStr : strs[0];
            index--;
            return strs[index];
        },
        // History.down :: String -> String
        down: str => {
            if(index === strs.length) return str;
            index++;
            if(index === strs.length) return tempStr;
            return strs[index];
        },
        // History.reset :: () -> ()
        reset: () => {
            strs.length = 0;
            index = 0;
            tempStr = '';
        }
    };
})();

const Notice = (() => {
    let id = undefined; // id :: Maybe TimeoutID

    return {
        // Notice.set :: String -> ()
        set: html => {
            // regex :: RegExp
            const regex = /^(.*?)(<span class="color_red">(.*?)<\/span>(.*))?$/;
            const target = dgebi('notice'); // target :: Maybe Element
            // console.assert(target !== null);
            if(id !== undefined) {
                window.clearTimeout(id);
                target.innerHTML += ' ; ';
            }
            target.innerHTML += (tmp => {
                const ret = []; // ret :: [String]
                while(tmp !== '') {
                    // result :: Maybe [Maybe String]
                    const result = regex.exec(tmp);
                    // console.assert(result !== null);
                    // console.assert(result[1] !== undefined);
                    ret.push(htmlEscape(result[1]));
                    if(result[2] === undefined) break;
                    // console.assert(result[3] !== undefined);
                    const res3 = htmlEscape(result[3]); // res3 :: String
                    ret.push(`<span class="color_red">${res3}</span>`);
                    tmp = result[4];
                }
                return ret.join('');
            })(html);
            id = window.setTimeout(Notice.clear, NOTICE_CLEAR_TIME);
            html = 'notice> ' + html;
            const log = [], line = []; // log :: [String];  line :: [String]
            while(html !== '') {
                // result :: Maybe [Maybe String]
                const result = regex.exec(html);
                // console.assert(result !== null);
                // console.assert(result[1] !== undefined);
                log.push(result[1]);
                if(result[2] === undefined) break;
                line.push(' '.repeat(result[1].length));
                // console.assert(result[3] !== undefined);
                log.push(result[3]);
                line.push('^' + '~'.repeat(result[3].length - 1));
                html = result[4];
            }
            // lineJoin :: String
            const lineJoin = line === [] ? '' : '\n' + line.join('');
            console.log(`${log.join('')}${lineJoin}`);
        },
        // Notice.clear :: () -> ()
        clear: () => {
            if(id === undefined) return;
            window.clearTimeout(id);
            if(window.getSelection().toString().length > 0) {
                // select :: Range
                const select = window.getSelection().getRangeAt(0);
                const range = document.createRange(); // range :: Range
                range.selectNodeContents(dgebi('notice'));
                // func :: (Object, IntegerNumber) -> Bool
                const func = (how, compare) => {
                    return range.compareBoundaryPoints(how, select) === compare;
                };
                // isSSAfter :: Bool;  isESAfter :: Bool;  isForward :: Bool
                const isSSAfter = func(Range.START_TO_START, 1);
                const isESAfter = func(Range.END_TO_START, 1);
                const isForward = isSSAfter && isESAfter;
                // isEEBefore :: Bool;  isSEBefore :: Bool;  isBackward :: Bool
                const isEEBefore = func(Range.END_TO_END, -1);
                const isSEBefore = func(Range.START_TO_END, -1);
                const isBackward = isEEBefore && isSEBefore;
                if(!(isForward || isBackward)) {
                    Notice.stopTimer();
                    return;
                }
            }
            dgebi('notice').innerHTML = '';
            id = undefined;
        },
        // Notice.stopTimer :: () -> ()
        stopTimer: () => {
            if(id === undefined) return;
            window.clearTimeout(id);
            id = -1;
        },
        // Notice.resumeTimer :: () -> ()
        resumeTimer: () => {
            if(id !== -1) return;
            id = window.setTimeout(Notice.clear, NOTICE_CLEAR_TIME);
        }
    };
})();

const Trash = (() => {
    const items = []; // items :: [String]

    return {
        // Trash.push :: String -> ()
        push: item => items.push(item),
        // Trash.pop :: () -> ()
        pop: () => {
            if(items.length === 0) {
                Notice.set('trash is empty');
                return;
            }
            items.pop().split(SEPARATOR).forEach(x => parseMain(x, 'priv'));
        },
        // Trash.reset :: () -> ()
        reset: () => items.length = 0
    }
})();

const Sound = (() => {
    const sounds = []; // sounds :: Map String Audio
    let volume = 100, mute = 1; // volume :: NaturalNumber;  mute :: BoolNumber

    return {
        // Sound.setVolume :: String -> ()
        setVolume: str => {
            const n = parseInt10(str); // n :: Maybe NaturalNumber
            if(n < 0 || n > 100 || !/^\d+$/.test(str)) {
                Notice.set('error: volume ' + makeErrorDom(str));
                return;
            }
            volume = n;
            TaskQueue.setVolume(volume / 100 * mute);
            dgebi('range_volume').value = volume;
            dgebi('volume').innerText = volume;
        },
        // Sound.setMute :: String -> ()
        setMute: flag => {
            switch(flag) {
                case 'on':
                    mute = 0;
                    break;
                case 'off':
                    mute = 1;
                    break;
                case '':
                    mute = 1 - mute;
                    break;
            }
            if(mute === 0) {
                dgebi('range_volume').setAttribute('disabled', '');
                dgebi('volume_name').className = 'strike';
                dgebi('volume').className = 'strike';
            } else { // mute === 1
                dgebi('range_volume').removeAttribute('disabled');
                dgebi('volume_name').className = '';
                dgebi('volume').className = '';
            }
            TaskQueue.setVolume(volume / 100 * mute);
        },
        // Sound.init :: () ~-> ()
        init: () => {
            for(let i = 0; i < NUMBER_OF_SOUNDS; i++) { // i :: NaturalNumber
                const url = `sound/alarm${i}.mp3`; // url :: String
                sounds[url] = new Audio(url);
                sounds[url].muted = true;
                sounds[url].onloadeddata = e => sounds[url].play();
            }
        },
        // Sound.play :: (String, String) -> ()
        play: (url, id) => {
            if(sounds[url] === undefined || sounds[url].readyState < 2) {
                console.log('failed to play: ' + url);
                return;
            }
            const sound = new Audio(); // sound :: Audio
            sound.src = sounds[url].src;
            sound.volume = volume / 100 * mute;
            sound.currentTime = 0;
            sound.play();
            const isPlay = TaskQueue.isPlay(id); // isPlay :: Bool
            // soundId :: NaturalNumber
            const soundId = TaskQueue.setSound(sound, id);
            sound.addEventListener('ended', () => {
                TaskQueue.removeSound(id, soundId);
                if(TaskQueue.isPlay(id)) return;
                removeDom('stopButton_' + id);
            }, {once: true});
            if(isPlay) return;
            dgebi('item_' + id).innerHTML +=
                    `<input id="stopButton_${id}" type="button" value="stop" onclick="parseMain('#stop $${id}', 'priv');">`;
        },
        // Sound.stop :: (String, String) -> ()
        stop: (id, callFrom) => TaskQueue.stopSound(id, callFrom),
        // Sound.save :: () -> [String]
        save: () => [`volume ${volume}${mute === 1 ? '' : ';mute'}`]
    };
})();

const Base64 = (() => {
    // KEY :: Base64String
    const KEY =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

    return {
        // Base64.encode :: String -> Base64String
        encode: str => {
            const ret = []; // ret :: [UnicodeNumber]
            encodeURIComponent(str).match(/.{1,3}/g).forEach(x => {
                // c :: [Maybe UnicodeNumber]
                const c = [...x].map(t => t.charCodeAt());
                ret.push(c[0] >> 2);
                const t1 = (c[0] & 3) << 4; // t1 :: UnicodeNumber
                if(x.length === 1) {
                    ret.push(t1, 64, 64);
                    return;
                }
                ret.push(t1 | (c[1] >> 4));
                const t2 = (c[1] & 15) << 2; // t2 :: UnicodeNumber
                if(x.length === 2) {
                    ret.push(t2, 64);
                } else { // x.length === 3
                    ret.push(t2 | (c[2] >> 6), c[2] & 63);
                }
            });
            return ret.map(x => KEY[x]).join('');
        },
        // Base64.decode :: Base64String -> String
        decode: str => {
            const tmp = []; // tmp :: [UnicodeNumber]
            str.replace(/[^A-Za-z\d+/=]/g, '').match(/.{4}/g).forEach(x => {
                // c :: [Maybe NaturalNumber]
                const c = [...x].map(t => KEY.indexOf(t));
                // console.assert(c.every(t => t >= 0));
                tmp.push((c[0] << 2) | (c[1] >> 4));
                if(c[2] === 64) return;
                tmp.push(((c[1] & 15) << 4) | (c[2] >> 2));
                if(c[3] === 64) return;
                tmp.push(((c[2] & 3) << 6) | c[3]);
            });
            // ret :: String
            const ret = tmp.map(x => String.fromCharCode(x)).join('');
            return decodeURIComponent(ret);
        }
    }
})();

const Save = (() => {
    // makeData :: () -> String
    const makeData = () => {
        // obj :: [Object]
        const obj = [
            Legacy,
            Tag,
            TaskQueue,
            Button,
            Display,
            Sound,
            Task,
            Macro
        ];
        return obj.map(x => x.save()).flat().join(SEPARATOR);
    };

    return  {
        // Save.exec :: () -> ()
        exec: () => window.localStorage.setItem('data', makeData()),
        // Save.toString :: () -> ()
        toString: () => {
            const tmp = document.cui_form.input.value; // tmp :: String
            document.cui_form.input.value = Base64.encode(makeData());
            dgebi('text_cui_form').select();
            document.execCommand('copy');
            document.cui_form.input.value = tmp;
            Notice.set('copied to clipboard');
        }
    };
})();

const Load = (() => {
    // parse :: (String, String) -> ()
    const parse = (data, flag) => {
        const rest = data.split(SEPARATOR); // rest :: String
        const version = rest.shift(); // version :: String
        if(Legacy.isPast(version)) {
            Legacy.convert(rest, version).forEach(x => parseMain(x, flag));
            Notice.set('new version ' + VERSION.join('.'));
        } else {
            rest.forEach(x => parseMain(x, flag));
        }
    };

    return {
        // Load.exec :: () -> ()
        exec: () => {
            // data :: Maybe String
            const data = window.localStorage.getItem('data');
            if(data === null) {
                detailsToggle(dgebi('menu').children[0]);
                detailsToggle(dgebi('document').children[0]);
                return;
            }
            parse(data, 'priv');
        },
        // Load.fromString :: () -> ()
        fromString: () => {
            // text :: Maybe Base64String
            const text = window.prompt('読み込むデータを入れてください:', '');
            if(text === '' || text === null) return;
            parseMain('#remove-macro *');
            parseMain('remove *#*;remove-tag *;remove-button *');
            parseMain('default 1a.;volume 100;mute-off;show-menu;hide-macro');
            parseMain('empty-trash;empty-history');
            parse(Base64.decode(text), 'priv');
            Notice.set('loaded');
        },
        // Load.mergeFromString :: () -> ()
        mergeFromString: () => {
            // text :: Maybe Base64String
            const text = window.prompt('追加するデータを入れてください:', '');
            if(text === '' || text === null) return;
            parse(Base64.decode(text), 'merge');
            Notice.set('merged');
        }
    };
})();

const Button = (() => {
    let buttonCount = 0; // buttonCount :: NaturalNumber
    const buttons = []; // buttons :: [ButtonObject]

    // rm :: [Maybe NaturalNumber] -> ()
    const rm = indices => {
        indices = indices.filter(x => x !== undefined);
        if(indices.length === 0) return;
        // items :: [ButtonObject]
        const items = indices.map(i => buttons[i]);
        Trash.push(items.map(item => item.saveText).join(SEPARATOR));
        items.map(x => x.id).forEach(id => {
            removeDom('button_' + id);
            buttons.splice(buttons.findIndex(x => x.id === id), 1);
        });
    };
    // updateIndex :: () -> ()
    const updateIndex = () => {
        Util.updateIndex('button_', buttons.map(x => x.id), x => x.children[0]);
    };

    return {
        // Button.insert :: (String, Maybe DateNumber) -> ()
        insert: (str, now = null) => {
            if(str === undefined) return;
            const isNull = now === null; // isNull :: Bool
            // buttonItem :: ButtonObject
            const buttonItem = {
                id: buttonCount,
                str: str,
                time: isNull ? Date.now() : now
            };
            buttonItem.saveText = `#$button ${buttonItem.time}#${str}`;
            if(!isNull) {
                // isEq :: ButtonObject -> Bool
                const isEq = x => {
                    return x.saveText === buttonItem.saveText && x.time === now;
                };
                if(buttons.findIndex(isEq) >= 0) return;
            }
            buttonCount++;
            const execStr = quotEscape(str); // execStr :: String
            // element :: Element
            const element = document.createElement('span');
            element.innerHTML =
                    `<input type="button" value="${str}" onclick="parseMain('${execStr}');"> `;
            Util.insert(buttons, buttonItem, element,
                    'button', 'button_parent');
            updateIndex();
        },
        // Button.insertByData :: String -> ()
        insertByData: str => Util.insertByData(str, Button.insert),
        // Button.remove :: String -> ()
        remove: str => {
            if(str === '') return;
            // result :: IndexObject
            const result = Util.parameterCheck(str, buttons.length);
            rm(result.data);
            if(result.isErr) {
                Notice.set('error: remove-button ' + result.str);
            }
            updateIndex();
        },
        // Button.save :: () -> [String]
        save: () => buttons.map(x => x.saveText)
    };
})();

const Display = (() => {
    const ALERT_WAIT_TIME = 1000; // ALERT_WAIT_TIME :: DateNumber
    let isShowMenu = true; // isShowMenu :: Bool

    return {
        // Display.show :: () -> ()
        show: () => TaskQueue.show(),
        // Display.doStrike :: (NaturalNumber, String, NaturalNumber) -> ()
        doStrike: (index, id, importance) => {
            const target = dgebi('text_' + id); // target :: Maybe Element
            // console.assert(target !== null);
            target.innerText += '!'.repeat(importance);
            Tag.emphUp(index, importance);
            dgebi('time_' + id).removeAttribute('onclick');
            switch(importance) {
                case 3:
                    window.setTimeout(window.alert, ALERT_WAIT_TIME
                            , target.innerText);
                case 2:
                    target.className = 'background-color_red';
                    BackgroundAlert.up();
                    break;
                case 1:
                    target.className = 'background-color_yellow';
                    break;
                case 0:
                    target.style.textDecoration = 'line-through';
                    window.setTimeout(parseMain, AUTO_REMOVE_TIME
                            , '#remove $' + id, 'priv');
                    break;
            }
        },
        // Display.showMenu :: () -> ()
        showMenu: () => {
            dgebi('menu').style.display = 'block';
            isShowMenu = true;
        },
        // Display.hideMenu :: () -> ()
        hideMenu: () => {
            dgebi('menu').style.display = 'none';
            isShowMenu = false;
        },
        // Display.save :: () -> [String]
        save: () => [isShowMenu ? 'show-menu' : 'hide-menu']
    };
})();

const Macro = (() => {
    const regex = /^([^;]*?)->(.*)$/; // regex :: RegExp
    const macros = []; // macros :: [MacroObject]
    let macroCount = 0; // macroCount :: NaturalNumber
    let isListShow = false; // isListShow :: Bool

    // rm :: [Maybe NaturalNumber] -> ()
    const rm = indices => {
        indices = indices.filter(x => x !== undefined);
        if(indices.length === 0) return;
        // items :: [MacroObject]
        const items = indices.map(i => macros[i]);
        Trash.push(items.map(item => item.saveText).join(SEPARATOR));
        if(!isListShow) {
            Notice.set('removed: ' + items.map(item => item.str).join(' , '));
        }
        items.map(x => x.id).forEach(id => {
            removeDom('macro_' + id);
            macros.splice(macros.findIndex(x => x.id === id), 1);
        });
    };

    return {
        // Macro.isInsertSuccess :: (String, Maybe DateNumber) -> Bool
        isInsertSuccess: (s, now = null) => {
            const result = regex.exec(s); // result :: Maybe [Maybe String]
            if(result === null || result[1] === '') return false;
            // console.assert(result[2] !== null);
            const id = macroCount; // id :: NaturalNumber
            const isNull = now === null; // isNull :: Bool
            if(isNull) {
                now = Date.now();
            }
            // macroItem :: MacroObject
            const macroItem = {
                key: new RegExp(result[1], 'gu'),
                str: s,
                value: result[2],
                id: id,
                time: now,
                saveText: `-> ${now}#${s}`
            };
            if(!isNull) {
                // isEq :: MacroObject -> Bool
                const isEq = x => {
                    return x.saveText === macroItem.saveText && x.time === now;
                };
                if(macros.findIndex(isEq) >= 0) return true;
            }
            macroCount++;
            const element = document.createElement('li'); // element :: Element
            // formatStr :: String
            const formatStr = s.replace(regex, '$1 -> $2');
            const escapeStr = htmlEscape(formatStr); // escapeStr :: String
            element.innerHTML =
                    `<input type="button" value="remove" onclick="parseMain('#remove-macro $${id}', 'priv');"> ${escapeStr}`;
            Util.insert(macros, macroItem, element, 'macro', 'macro_parent');
            if(!isListShow && isNull) {
                Notice.set('macro: ' + formatStr);
            }
            return true;
        },
        // Macro.insertByData :: String -> ()
        insertByData: str => Util.insertByData(str, Macro.isInsertSuccess),
        // Macro.replace :: String -> String
        replace: s => {
            macros.forEach(x => s = s.replace(x.key, x.value));
            return s;
        },
        // Macro.remove :: (String, String) -> ()
        remove: (str, callFrom) => {
            if(str === '') return;
            if(callFrom === 'priv') {
                // idResult :: Maybe [Maybe String]
                const idResult = /^\$(\d+)$/.exec(str);
                if(idResult !== null) {
                    // id :: Maybe NaturalNumber
                    const id = parseInt10(idResult[1]);
                    // console.assert(isNaN(id));
                    rm([macros.findIndex(x => x.id === id)]);
                    return;
                }
            }
            // result :: IndexObject
            const result = Util.parameterCheck(str, macros.length);
            rm(result.data);
            if(result.isErr) {
                Notice.set('error: remove-macro ' + result.str);
            }
        },
        // Macro.show :: () -> ()
        show: () => {
            dgebi('macros').style.display = 'block';
            isListShow = true;
        },
        // Macro.hide :: () -> ()
        hide: () => {
            dgebi('macros').style.display = 'none';
            isListShow = false;
        },
        // Macro.save :: () -> [String]
        save: () => {
            // displayInst :: String
            const displayInst = isListShow ? 'show-macro' : 'hide-macro';
            return [displayInst, ...macros.map(x => x.saveText)];
        }
    };
})();

const Task = (() => {
    let defaultSound = '1'; // defaultSound :: String
    let defaultImportance = 0; // defaultImportance :: NaturalNumber
    let defaultDisplay = 'a'; // defaultDisplay :: String

    // importanceStr :: () -> String
    const importanceStr = () => ['.', '!', '!!', '!!!'][defaultImportance];
    // format :: () -> String
    const format = () => defaultSound + defaultDisplay + importanceStr();
    // timer :: (String, DateNumber) -> Maybe DateNumber
    const timer = (s, now) => {
        // regex :: RegExp
        const regex =
                /^((?:(\d+),)?(\d*?)(\d{0,2})(?:\.(\d+))?)$|^((?:(.*)d)?(?:(.*)h)?(?:(.*)m)?(?:(.*)s)?)$/;
        const result = regex.exec(s); // result :: Maybe [Maybe String]
        if(s === '' || result === null) return null;
        let ret = 0; // ret :: DateNumber
        // correct : NaturalNumber
        const correct = result[1] !== undefined ? 2 : 7;
        const table = [86400, 3600, 60, 1]; // table :: NaturalNumber
        for(let i = 0; i < 4; i++) { // i :: NaturalNumber
            if(result[i + correct] !== undefined) {
                // console.assert(result[i + correct] !== undefined);
                // value :: Maybe NaturalNumber
                const value = Number('0' + result[i + correct], 10);
                if(isNaN(value)) return null;
                ret += table[i] * value;
            }
        }
        return now + 1000 * ret;
    };
    // alarm :: (String, DateNumber) -> Maybe DateNumber
    const alarm = (s, now) => {
        // regex :: RegExp
        const regex = /^(?:(?:(\d*)-)?(\d*)-(\d*),)?(\d*):(\d*)(?::(\d*))?$/;
        const result = regex.exec(s); // result :: Maybe [Maybe String]
        if(result === null) return null;
        let ret = new Date(now); // ret :: Date
        let isFind = false; // isFind :: Bool
        const isFree = []; // isFree :: [NaturalNumber]
        // table :: [Object]
        const table = [
            {get: 'getFullYear', set: 'setFullYear', c: 0, r: 0},
            {get: 'getMonth', set: 'setMonth', c: -1, r: 0},
            {get: 'getDate', set: 'setDate', c: 0, r: 1},
            {get: 'getHours', set: 'setHours', c: 0, r: 0},
            {get: 'getMinutes', set: 'setMinutes', c: 0, r: 0},
            {get: 'getSeconds', set: 'setSeconds', c: 0, r: 0}
        ];
        ret.setMilliseconds(500);
        for(let i = 0; i < 6; i++) { // i :: NaturalNumber
            const t = table[i]; // t :: Object
            if(result[i + 1] !== '' && result[i + 1] !== undefined) {
                ret[t.set](parseInt10(result[i + 1]) + t.c);
                isFind = true;
            } else if(isFind) {
                ret[t.set](t.r);
            } else {
                isFree.push(i);
            }
        }
        while(now >= ret.getTime() && isFree.length > 0) {
            const tmp = ret; // tmp :: DateNumber
            const t = table[isFree.pop()]; // t :: Object
            tmp[t.set](ret[t.get]() + 1);
            if(tmp.getTime() > ret.getTime()) {
                ret = tmp;
            }
        }
        return ret.getTime();
    };

    return {
        // Task.setDefault :: Maybe String -> ()
        setDefault: str => {
            if(str !== '') {
                // result :: Maybe [Maybe String]
                const result = /^(-|\d+)?([ast])?(\.|!{1,3})?$/.exec(str);
                if(result !== null) {
                    if(result[1] !== undefined) {
                        defaultSound = result[1];
                    }
                    if(result[2] !== undefined) {
                        defaultDisplay = result[2] !== 's'
                                ? result[2]
                                : defaultDisplay === 'a' ? 't' : 'a';
                    }
                    if(result[3] !== undefined) {
                        defaultImportance = Task.importanceToNum(result[3]);
                    }
                }
            }
            Notice.set('default: ' + format());
            return;
        },
        // Task.parse :: (String, String) -> Maybe TaskObject
        parse: (s, callFrom) => {
            // regHead :: String
            const regHead = callFrom === 'global'
                    ? '^(?:()())?'
                    : '^(?:(\\d+)([at]))?';
            // regex :: RegExp
            const regex = new RegExp(regHead +
                    '([^\\/]*)((?:\\/(?:(-|\\d+)|([^\\/]*?)\\*)??([at])?(\\.|!{1,3})?(?:#([^ \\/]*))?(?:\\/(.*))?)?)$');
            const result = regex.exec(s); // result :: Maybe [Maybe String]
            const ret = new Object(); // ret :: TaskObject
            const execs = []; // execs :: [String]
            if(result === null || result[9] === '*') return null;
            // now :: Maybe DateNumber
            const now = result[1] !== undefined
                    ? parseInt10(result[1])
                    : Date.now();
            // console.assert(isNaN(now));
            if(result[1] !== undefined) {
                ret.when = result[1];
                ret.display = result[2];
            } else {
                ret.when = String(now);
                ret.display = defaultDisplay;
            }
            // plusSplit :: Maybe [Maybe String]
            const plusSplit = /^([^\+]*?)(?:\+(.*))?$/.exec(result[3]);
            // console.assert(plusSplit !== null || plusSplit[1] !== undefined);
            ret.time = timer(plusSplit[1], now);
            if(ret.time === null) {
                ret.time = alarm(plusSplit[1], now);
                if(ret.time === null) return null;
            }
            ret.isValid = ret.time - Date.now() >= -UPDATE_TIME / 2;
            ret.tipText = result[3];
            switch(plusSplit[2]) {
                case undefined:
                    break;
                case '':
                    execs.push(plusSplit[1] + '+' + result[4]);
                    break;
                default:
                    execs.push(plusSplit[2] + result[4]);
                    break;
            }
            ret.tipText += '/';
            if(result[5] !== undefined) {
                execs.push('#sound ' + result[5]);
                ret.tipText += result[5];
            } else if(result[6] !== undefined) {
                execs.push(result[6]);
                ret.tipText += result[6] + '*';
            } else {
                execs.push('#sound ' + defaultSound);
                ret.tipText += defaultSound;
            }
            ret.display = result[7] !== undefined ? result[7] : ret.display;
            if(result[8] !== undefined) {
                ret.importance = Task.importanceToNum(result[8]);
                ret.tipText += result[8];
            } else {
                ret.importance = defaultImportance;
                ret.tipText += importanceStr();
            }
            ret.tag = result[9];
            if(result[10] !== undefined) {
                ret.name = htmlEscape(result[10]);
                ret.saveRawName = '/' + result[10];
            } else {
                ret.name = plusSplit[1];
                ret.saveRawName = '';
            }
            ret.exec = execs.join(';');
            ret.makeSaveText = () => {
                // tmp :: [String]
                const tmp = [
                    ret.when,
                    ret.display,
                    ret.tipText,
                    ret.tag === undefined ? '' : '#' + ret.tag,
                    ret.saveRawName
                ];
                return tmp.join('');
            };
            return ret;
        },
        // Task.init :: () -> ()
        init: () => {
            // setDefault :: (String, a) -> ()
            const setDefault = (id, value) => {
                const elements = dgebi(id).children; // elements :: [Element]
                for(let i = 0; i < elements.length; i++) { // i :: NaturalNumber
                    if(elements[i].value === value) {
                        elements[i].selected = true;
                        return;
                    }
                }
            };
            setDefault('gui_sound', defaultSound);
            setDefault('gui_importance', importanceStr());
        },
        // Task.importanceToNum :: String -> NaturalNumber
        importanceToNum: str => str === '.' ? 0 : str.length,
        // Task.save :: () -> [String]
        save: () => (['default ' + format()])
    };
})();

const Tag = (() => {
    let tagCount = 0; // tagCount :: NaturalNumber
    const tagTable = []; // tagTable :: [TagObject]

    // getIndexById :: Maybe NaturalNumber -> Maybe NaturalNumber
    const getIndexById = id => {
        if(id === undefined) return undefined;
        return tagTable.findIndex(x => x.id === id);
    };
    // parameterCheck :: String -> IDObject
    const parameterCheck = str => {
        // ret :: [IndexObject]
        const ret = str.split(' ').map(x => {
            const result = /^#(.*)$/.exec(x); // result :: Maybe [Maybe String]
            if(result !== null) {
                // index :: Maybe NaturalNumber
                const index = tagTable.findIndex(t => t.str === result[1]);
                const isErr = index === -1; // isErr :: Bool
                return {
                    data: isErr ? undefined : index,
                    isErr: isErr,
                    str: isErr ? makeErrorDom(x) : x
                };
            }
            return Util.parameterCheck(x, tagTable.length);
        });
        // nubData :: [Maybe NaturalNumber]
        const nubData = [...new Set(ret.map(x => x.data).flat())];
        // indexData :: [NaturalNumber]
        const indexData = nubData.filter(x => x !== undefined);
        return {
            data: indexData.map(x => ({index: x, id: tagTable[x].id})),
            isErr: ret.some(x => x.isErr),
            str: ret.map(x => x.str).join(' ')
        };
    };
    // rm :: [IDObject] -> String
    const rm = obj => {
        if(obj.length === 0) return;
        const items = obj.map(x => tagTable[x.index]); // items :: [TagObject]
        Trash.push(items.map(item => item.saveText()).join(SEPARATOR));
        const ret = obj.map(x => {
            const index = getIndexById(x.id); // index :: NaturalNumber
            if(!TaskQueue.isTagEmpty(x.id)) {
                return `#${tagTable[index].str} is not empty`;
            }
            removeDom('tag_parent_' + x.id);
            tagTable.splice(index, 1);
            return '';
        });
        return ret.filter(x => x !== '').join(' , ');
    };
    // toggle :: ([IDObject], String) -> ()
    const toggle = (obj, flag) => {
        if(obj.length === 0) return;
        // func :: IDObject -> ()
        const func = (() => {
            switch(flag) {
                case 'open':
                    return x => {
                        tagTable[x.index].isOpen = true;
                        // target :: Maybe Element
                        const target = dgebi('tag_parent_' + x.id).children[0];
                        // console.assert(target !== undefined);
                        offsetManage(() => {
                            target.removeAttribute('closed');
                            target.setAttribute('open', '');
                        });
                    };
                case 'close':
                    return x => {
                        tagTable[x.index].isOpen = false;
                        // target :: Maybe Element
                        const target = dgebi('tag_parent_' + x.id).children[0];
                        // console.assert(target !== undefined);
                        offsetManage(() => {
                            target.removeAttribute('open');
                            target.setAttribute('closed', '');
                        });
                    };
                case 'toggle':
                    return x => {
                        tagTable[x.index].isOpen = !tagTable[x.index].isOpen;
                        detailsToggle(dgebi('tag_parent_' + x.id).children[0]);
                    };
            }
        })();
        obj.forEach(func);
    };
    // updateIndex :: () -> ()
    const updateIndex = () => {
        Util.updateIndex('tag_name_', tagTable.map(x => x.id), x => x);
    };

    return {
        // Tag.getLength :: () -> NaturalNumber
        getLength: () => tagTable.length,
        // Tag.insert :: (String, Maybe DateNumber) -> ()
        insert: (str, now = null) => {
            const isNowNull = now === null; // isNowNull :: Bool
            if(isNowNull) {
                now = Date.now();
            }
            // tmp :: [Object]
            const tmp = str.split(' ').map(x => {
                // successObj :: Object
                const successObj = {isErr: false, str: x};
                if(!isNowNull) {
                    // isEq :: TagObject -> Bool
                    const isEq = t => t.time === now && t.str === x;
                    if(tagTable.findIndex(isEq) >= 0) return successObj;
                }
                // isExist :: Bool
                const isExist = tagTable.find(t => t.str === x) !== undefined;
                if(isExist || !Tag.isValidName(x)) {
                    return {isErr: true, str: makeErrorDom(x)};
                }
                // tagItem :: TagObject
                const tagItem = {
                    id: tagCount,
                    str: x,
                    time: now,
                    isOpen: false,
                    numYellow: 0,
                    numRed: 0,
                    saveText: () => {
                        // head :: String
                        const head = `#$tag ${tagItem.time}#${x}`;
                        if(!tagItem.isOpen) return head;
                        return head + ';#toggle-tag #' + tagItem.str;
                    }
                };
                tagCount++;
                const qEscape = '#' + quotEscape(x); // qEscape :: String
                const hEscape = '#' + htmlEscape(x); // hEscape :: String
                // element :: Element
                const element = document.createElement('div');
                element.innerHTML =
                        `<span closed><span id="tag_name_${tagItem.id}" onclick="parseMain('#toggle-tag ${qEscape}');">${hEscape}</span> <input id="remove_tag_${tagItem.id}" type="button" value="remove" onclick="parseMain('#remove-tag ${qEscape}');"></span><div style="padding-left: 0px"><ol id="parent_${tagItem.id}"></ol></div>`;
                Util.insert(tagTable, tagItem, element,
                        'tag_parent', 'tag_parent');
                TaskQueue.newTag(tagItem.id);
                return successObj;
            });
            if(tmp.map(x => x.isErr).some(x => x)) {
                Notice.set('error: tag ' + tmp.map(x => x.str).join(' '));
            }
            updateIndex();
        },
        // Tag.insertByData :: String -> ()
        insertByData: str => Util.insertByData(str, Tag.insert),
        // Tag.remove :: String -> ()
        remove: str => {
            if(str === '') return;
            const result = parameterCheck(str); // result :: IDObject
            const info = rm(result.data); // info :: String
            if(result.isErr || info !== '') {
                const t = info === '' ? '' : ' , ' + info; // t :: String
                Notice.set('error: remove-tag ' + result.str + t);
            }
            updateIndex();
        },
        // Tag.findIndex :: Maybe String -> Maybe NaturalNumber
        findIndex: str => {
            if(str === undefined) return undefined;
            // ret :: Maybe NaturalNumber
            const ret = tagTable.findIndex(x => x.str === str);
            return ret === -1 ? -1 : tagTable[ret].id;
        },
        // Tag.showRemoveButton :: NaturalNumber -> ()
        showRemoveButton: id => {
            if(getIndexById(id) === -1) return;
            dgebi('remove_tag_' + id).style.display = null;
        },
        // Tag.hideRemoveButton :: NaturalNumber -> ()
        hideRemoveButton: id => {
            dgebi('remove_tag_' + id).style.display = 'none';
        },
        // Tag.emphUp :: (Maybe NaturalNumber, NaturalNumber) -> ()
        emphUp: (id, importance) => {
            if(id === undefined) return;
            const index = getIndexById(id); // index :: Maybe NaturalNumber
            switch(importance) {
                case 1:
                    tagTable[index].numYellow++;
                    break;
                case 2:
                case 3:
                    tagTable[index].numRed++;
                    break;
                default:
                    return;
            }
            const target = dgebi('tag_name_' + id); // nameId :: Maybe String
            // console.assert(target !== null);
            if(tagTable[index].numRed > 0) {
                target.className = 'background-color_red';
            } else if(tagTable[index].numYellow > 0) {
                target.className = 'background-color_yellow';
            }
        },
        // Tag.emphDown :: (Maybe NaturalNumber, NaturalNumber) -> ()
        emphDown: (id, importance) => {
            if(id === undefined) return;
            const index = getIndexById(id); // index :: Maybe NaturalNumber
            switch(importance) {
                case 1:
                    tagTable[index].numYellow--;
                    break;
                case 2:
                case 3:
                    tagTable[index].numRed--;
                    break;
                default:
                    return;
            }
            if(tagTable[index].numRed > 0) return;
            const target = dgebi('tag_name_' + id); // nameId :: Maybe String
            // console.assert(target !== null);
            if(tagTable[index].numYellow > 0) {
                target.className = 'background-color_yellow';
            } else {
                target.className = '';
            }
        },
        // Tag.toggle :: (String, String) -> ()
        toggle: (str, flag) => {
            if(str === '') return;
            const result = parameterCheck(str); // result :: IDObject
            toggle(result.data, flag);
            if(result.isErr) {
                Notice.set(`error: ${flag}-tag ${result.str}`);
            }
        },
        // Tag.isValidName :: String -> Bool
        isValidName: str => !/\//.test(str) && str !== '*',
        // Tag.save :: () -> [String]
        save: () => tagTable.map(x => x.saveText())
    };
})();

const TaskQueue = (() => {
    const taskQueue = []; // taskQueue :: [TaskObject]
    let idCount = 0; // idCount :: NaturalNumber

    taskQueue[undefined] = [];
    taskQueue[undefined][-1] = {id: 'global', sound: [], soundCount: 0};

    // deadlineStr :: (DateNumber, DateNumber) -> String
    const deadlineStr = (deadline, now) => {
        const deadlineObj = new Date(deadline); // deadlineObj :: Date
        const ret = []; // ret :: [String]
        if(Math.abs(deadline - now) >= 86400000) {
            if(Math.abs(deadline - now) >= 86400000 * 365) {
                ret.push(deadlineObj.getFullYear() + '-');
            }
            ret.push(`${deadlineObj.getMonth() + 1}-${deadlineObj.getDate()},`);
        }
        return ret.join('') + toHms(deadlineObj);
    };
    // getAllObj :: () -> [TaskObject]
    const getAllObj = () => [taskQueue[undefined], ...taskQueue].flat();
    // parameterCheck :: String -> IDObject
    const parameterCheck = str => {
        // ret :: [Object]
        const ret = str.split(' ').map(x => {
            // makeObj :: [TaskObject] -> Object
            const makeObj = items => {
                return {
                    data: items.map(t1 => {
                        // tagNo :: Maybe NaturalNumber
                        const tagNo = Tag.findIndex(t1.tag);
                        // target :: [TaskObject]
                        const target = taskQueue[tagNo];
                        return {
                            index: target.findIndex(t2 => t2.id === t1.id),
                            id: t1.id,
                            tagNo: tagNo
                        };
                    }),
                    isErr: false,
                    str: x
                };
            };
            // invalidResult :: Maybe [Maybe String]
            const invalidResult = /^(\.|!{1,3})(?:#(.*))?$/.exec(x);
            if(invalidResult !== null) {
                // filt :: NaturalNumber -> TaskObject -> Bool
                const filt = n => t => !t.isValid && t.importance <= n;
                // func :: NaturalNumber -> ()
                const func = invalidResult[2] === '*'
                        ? n => makeObj(getAllObj().filter(filt(n)))
                        : n => {
                            // index :: Maybe NaturalNumber
                            const index = Tag.findIndex(invalidResult[2]);
                            return makeObj(taskQueue[index].filter(filt(n)));
                        };
                return func(Task.importanceToNum(invalidResult[1]));
            }
            if(x === '*#*') return makeObj(getAllObj());
            // errObj :: Object
            const errObj = x === '*'
                    ? {data: [], isErr: false, str: '*'}
                    : {isErr: true, str: makeErrorDom(x)};
            // decomp :: Maybe [Maybe String]
            const decomp = /^([^#]*)(?:#(.*))?$/.exec(x);
            // tagNo :: Maybe NaturalNumber
            const tagNo = Tag.findIndex(decomp[2]);
            if(tagNo === -1) return errObj;
            const max = taskQueue[tagNo].length; // max :: NaturalNumber
            if(decomp[1] === '*') {
                decomp[1] = '1-' + max;
            }
            // rangeResult :: Maybe [Maybe String]
            const rangeResult = /^(\d*)-(\d*)$/.exec(decomp[1]);
            if(x !== '-' && rangeResult !== null) {
                // border :: [Maybe NaturalNumber]
                const border = rangeResult.slice(1).map(t => parseInt10(t));
                if(border[0] > max || border[1] < 1) return errObj;
                if(isNaN(border[0]) || border[0] < 1) {
                    border[0] = 1;
                }
                if(isNaN(border[1]) || border[1] > max) {
                    border[1] = max;
                }
                // newArr :: [NaturalNumber]
                const newArr = [...Array(border[1] - border[0] + 1).keys()];
                // mapping :: NaturalNumber -> TaskObject
                const mapping = t => taskQueue[tagNo][t + border[0] - 1];
                return makeObj(newArr.map(mapping));
            }
            // index :: Maybe NaturalNumber
            const index = parseInt10(decomp[1]) - 1;
            return index >= 0 && index < max && /^\d+$/.test(decomp[1])
                    ? {
                        data: [{
                            index: index,
                            id: taskQueue[tagNo][index].id,
                            tagNo: tagNo
                        }],
                        isErr: false,
                        str: x
                    }
                    : errObj;
        });
        const nubData = []; // nubData :: [Object]
        const tmp = [...ret.map(x => x.data).flat()]; // tmp :: [Maybe Object]
        tmp.filter(x => x !== undefined).forEach(x => {
            // isEq :: Object -> Bool
            const isEq = t => {
                return ['index', 'id', 'tagNo'].every(tt => x[tt] === t[tt]);
            };
            if(nubData.some(isEq)) return;
            nubData.push(x);
        });
        return {
            data: nubData,
            isErr: ret.some(x => x.isErr),
            str: ret.map(x => x.str).join(' ')
        };
    };
    // getTagIndex :: String -> Maybe IDObject
    const getTagIndex = id => {
        if(id === 'global') return {index: -1, id: 'global', tagNo: undefined};
        // item :: Maybe TaskObject
        const item = getAllObj().find(x => x.id === id);
        if(item === undefined) return undefined;
        const tagNo = Tag.findIndex(item.tag); // tagNo :: Maybe NaturalNumber
        return {
            index: taskQueue[tagNo].findIndex(x => x.id === id),
            id: id,
            tagNo: tagNo
        };
    };
    // display :: ([IDObject], String) -> ()
    const display = (ids, flag) => {
        if(ids.length === 0) return;
        // func :: String -> String
        const func = flag === '-alarm'
                ? (x => 'a')
                : flag === '-timer' ? (x => 't') : (x => x === 'a' ? 't' : 'a');
        ids.forEach(x => {
            // result :: String
            const result = func(taskQueue[x.tagNo][x.index].display);
            taskQueue[x.tagNo][x.index].display = result;
        });
    };
    // rm :: ([Maybe IDObject], Bool) -> ()
    const rm = (ids, isNeedTrashPush = true) => {
        ids = ids.filter(x => x !== undefined);
        if(ids.length === 0) return;
        // items :: [TaskObject]
        const items = ids.map(x => taskQueue[x.tagNo][x.index]);
        if(isNeedTrashPush) {
            Trash.push(items.map(item => '#' + item.makeSaveText())
                            .join(SEPARATOR));
        }
        ids.forEach(x => {
            TaskQueue.stopSound('$' + x.id, 'priv');
            removeDom('item_' + x.id);
            // i :: Maybe NaturalNumber
            const i = taskQueue[x.tagNo].findIndex(t => t.id === x.id);
            // console.assert(i >= 0);
            const target = taskQueue[x.tagNo][i]; // target :: TaskObject
            if(!target.isValid) {
                Tag.emphDown(x.tagNo, target.importance);
                if(target.importance > 1) {
                    BackgroundAlert.down();
                }
            }
            taskQueue[x.tagNo].splice(i, 1);
        });
        taskQueue.forEach((x, i) => {
            if(x.length === 0) {
                Tag.showRemoveButton(i);
            }
        });
    };
    // stop :: [String] -> ()
    const stop = ids => {
        if(ids.length === 0) return;
        ids.forEach(x => {
            removeDom('stopButton_' + x.id);
            taskQueue[x.tagNo][x.index].sound.forEach(t => t.pause());
            taskQueue[x.tagNo][x.index].sound = [];
        });
    };

    return {
        // TaskQueue.setDisplay :: (String, String, String) -> ()
        setDisplay: (str, flag, callFrom) => {
            if(str === '') {
                str = '*#*';
            }
            if(callFrom === 'priv') {
                // idResult :: Maybe [Maybe String]
                const idResult = /^\$(\d+)$/.exec(str);
                if(idResult !== null) {
                    // console.assert(idResult[1] !== undefined);
                    display([getTagIndex(idResult[1])], flag);
                    return;
                }
            }
            const result = parameterCheck(str); // result :: IDObject
            display(result.data, flag);
            if(result.isErr) {
                Notice.set(`error: switch${flag} ${result.str}`);
            }
        },
        // TaskQueue.setSound :: (Audio, String) -> NaturalNumber
        setSound: (sound, id) => {
            const x = getTagIndex(id); // x :: Maybe IDObject
            // count :: NaturalNumber
            const count = taskQueue[x.tagNo][x.index].soundCount;
            sound.soundId = count;
            taskQueue[x.tagNo][x.index].sound.push(sound);
            taskQueue[x.tagNo][x.index].soundCount++;
            return count;
        },
        // TaskQueue.setVolume :: NaturalNumber -> ()
        setVolume: volume => {
            getAllObj().forEach(x => {
                const sound = x.sound; // sound :: Maybe Sound
                if(sound === undefined) return;
                sound.forEach(t => t.volume = volume);
            });
        },
        // TaskQueue.isPlay :: String -> Bool
        isPlay: id => {
            const x = getTagIndex(id); // x :: Maybe IDObject
            // console.assert(x !== undefined);
            const t = taskQueue[x.tagNo][x.index]; // t :: Maybe TaskObject
            return t !== undefined && t.sound.length > 0;
        },
        // TaskQueue.insert :: (TaskObject, String) -> ()
        insert: (taskItem, flag) => {
            if(taskItem.tag !== undefined && Tag.findIndex(taskItem.tag) < 0) {
                Tag.insert(taskItem.tag);
            }
            const id = taskItem.id = String(idCount); // id :: String
            // index :: Maybe NaturalNumber
            const index = Tag.findIndex(taskItem.tag);
            if(flag === 'merge') {
                // isEq :: TaskObject -> Bool
                const isEq = x => x.makeSaveText() === taskItem.makeSaveText();
                if(taskQueue[index].some(isEq)) return;
            }
            idCount++;
            taskItem.sound = [];
            taskItem.soundCount = 0;
            // newElement :: Element
            const element = document.createElement('li');
            element.innerHTML =
                    `<input type="button" value="remove" onclick="parseMain('#remove $${id}', 'priv');"> <span id="text_${id}" title="${taskItem.tipText}">${taskItem.name}</span><span id="time_${id}" onclick="parseMain('#switch $${id}', 'priv')"></span> `;
            // parentId :: String
            const parentId = `parent${index === undefined ? '' : '_' + index}`;
            Util.insert(taskQueue[index], taskItem, element, 'item', parentId);
            if(index !== undefined) {
                Tag.hideRemoveButton(index);
            }
            if(!taskItem.isValid) {
                Display.doStrike(index, id, taskItem.importance);
            }
        },
        // TaskQueue.move :: (String, Maybe String) -> ()
        move: (str, tag) => {
            const result = parameterCheck(str); // result :: IDObject
            if(result.data.length === 0) return;
            // item :: [TaskObject]
            const item = result.data.map(x => taskQueue[x.tagNo][x.index]);
            const isTagValid = Tag.isValidName(tag); // isTagValid :: Bool
            if(isTagValid) {
                rm(result.data, false);
                item.forEach(x => {
                    x.tag = tag;
                    TaskQueue.insert(x, 'global');
                });
            }
            if(result.isErr || !isTagValid) {
                // tagName :: String
                const tagName = tag === undefined ? '' : '#' + tag;
                // htmlStr :: String
                const htmlStr = isTagValid ? tagName : makeErrorDom(tagName);
                Notice.set(`error: move${htmlStr} ${result.str}`);
            }
        },
        // TaskQueue.remove :: (String, String) -> ()
        remove: (str, callFrom) => {
            if(callFrom === 'priv') {
                // idResult :: Maybe [Maybe String]
                const idResult = /^\$(\d+)$/.exec(str);
                if(idResult !== null) {
                    // console.assert(idResult[1] !== undefined);
                    rm([getTagIndex(idResult[1])]);
                    return;
                }
            }
            const result = parameterCheck(str); // result :: IDObject
            rm(result.data);
            if(result.isErr) {
                Notice.set('error: remove ' + result.str);
            }
        },
        // TaskQueue.newTag :: NaturalNumber -> ()
        newTag: tagIndex => taskQueue[tagIndex] = [],
        // TaskQueue.isTagEmpty :: NaturalNumber -> Bool
        isTagEmpty: tagIndex => taskQueue[tagIndex].length === 0,
        // TaskQueue.stopSound :: (String, String) -> ()
        stopSound: (str, callFrom) => {
            if(callFrom === 'priv') {
                if(str === '$global') {
                    stop([getTagIndex('global')]);
                    return;
                }
                // idResult :: Maybe [Maybe String]
                const idResult = /^\$(\d+)$/.exec(str);
                if(idResult !== null) {
                    // console.assert(idResult[1] !== undefined);
                    stop([getTagIndex(idResult[1])]);
                    return;
                }
            }
            switch(str) {
                case '':
                    stop([getTagIndex('global')]);
                    return;
                case '*':
                case '*#*':
                    stop([getTagIndex('global')]);
                    break;
            }
            stop(parameterCheck(str).data);
        },
        // TaskQueue.removeSound :: (String, NaturalNumber) -> ()
        removeSound: (id, soundId) => {
            const obj = getTagIndex(id); // obj :: Maybe IDObject
            if(obj === undefined) return;
            // targetSoundObj :: [Audio]
            const targetSoundObj = taskQueue[obj.tagNo][obj.index].sound;
            // target :: NaturalNumber
            const target = targetSoundObj.findIndex(x => x.soundId === soundId);
            taskQueue[obj.tagNo][obj.index].sound.splice(target, 1);
        },
        // TaskQueue.checkDeadline :: (DateNumber, DateNumber) -> ()
        checkDeadline: (interval, now) => {
            // isLoop :: (Maybe NaturalNumber, NaturalNumber) -> Bool
            const isLoop = (i, j) => {
                if(taskQueue[i][j] === undefined) return false;
                return now - taskQueue[i][j].time >= -interval / 2;
            };
            // indices :: [Maybe NaturalNumber]
            const indices = taskQueue.map((t, i) => i);
            [undefined, ...indices.filter(t => t !== undefined)].forEach(i => {
                for(let j = 0; isLoop(i, j); j++) { // j :: NaturalNumber
                    const target = taskQueue[i][j]; // target :: TaskObject
                    if(target.isValid) {
                        taskQueue[i][j].isValid = false;
                        parseMain(target.exec, target.id);
                        Display.doStrike(i, target.id, target.importance);
                    }
                }
            });
        },
        // TaskQueue.show :: () -> ()
        show: () => {
            // dlStr :: (DateNumber, DateNumber) -> String
            const dlStr = (deadline, now) => `(${deadlineStr(deadline, now)})`;
            // restStr :: (DateNumber, DateNumber) -> String
            const restStr = (deadline, now) => {
                const r = Math.ceil((deadline - now) / 1000); // r :: DateNumber
                const d = Math.floor(r / 86400); // d :: NaturalNumber
                // arr :: [Number]
                const arr = [(r % 86400) / 3600, (r % 3600) / 60, r % 60];
                const ret = makeClockStr(arr); // ret :: String
                return d > 0 ? `[${d},${ret}]` : `[${ret}]`;
            };
            const now = Date.now(); // now :: DateNumber
            getAllObj().forEach(x => {
                dgebi('time_' + x.id).innerText = !x.isValid
                        ? '@' + deadlineStr(x.time, now)
                        : x.display === 'a'
                            ? dlStr(x.time, now)
                            : restStr(x.time, now);
            });
        },
        // TaskQueue.save :: () -> [String]
        save: () => getAllObj().map(x => x.makeSaveText())
    };
})();

const Legacy = (() => {
    // parseVersion :: String -> [NaturalNumber]
    const parseVersion = version => {
        // result :: Maybe [Maybe String]
        const result = /^ver (\d+)\.(\d+)\.(\d+)$/.exec(version);
        // console.assert(result !== null);
        return [result[1], result[2], result[3]].map(x => parseInt10(x));
    };
    // lessThan :: ([NaturalNumber], [NaturalNumber]) -> Bool
    const lessThan = (a, b) => {
        for(let i = 0; i < 3; i++) { // i :: NaturalNumber
            if(a[i] < b[i]) return true;
            else if(a[i] > b[i]) return false;
        }
        return false;
    };

    return {
        // Legacy.isPast :: String -> Bool
        isPast: version => lessThan(parseVersion(version), VERSION),
        // Legacy.convert :: ([String], String) -> [String]
        convert: (data, version) => {
            // inputVer :: [NaturalNumber]
            const inputVer = parseVersion(version);
            let isChecked = false; // isChecked :: Bool
            if(isChecked || lessThan(inputVer, [0, 10, 4])) {
                isChecked = true;
                data = data.map(x => {
                    return x.replace(/^#\$tag (\d+)\$(.*)$/, '#$tag $1#$2');
                });
            }
            return data;
        },
        // Legacy.save :: () -> [String]
        save: () => ['ver ' + VERSION.join('.')]
    };
})();

dgebi('cover').addEventListener('click', () => {
    let mouseDownTime; // mouseDownTime :: DateNumber
    window.addEventListener('mousedown', event => {
        mouseDownTime = Date.now();
    });
    window.addEventListener('click', event => {
        const SHORT_TIME = 250; // SHORT_TIME :: DateNumber
        const str = window.getSelection().toString(); // str :: String
        const interval = Date.now() - mouseDownTime; // interval :: DateNumber
        if(interval > SHORT_TIME && str.length > 0 && str !== '\n') return;
        let target = event.target; // target :: Maybe Element
        while(target !== null) {
            if(target.id === 'menu') return;
            target = target.parentNode;
        }
        document.cui_form.input.focus();
    });
    dgebi('text_cui_form').addEventListener('input', submitButtonControl);
    dgebi('range_volume').addEventListener('input', () => {
        parseMain('#volume ' + dgebi('range_volume').value);
    });
    window.addEventListener('keydown', event => {
        if(event.ctrlKey) {
            switch(event.key) {
                case 'O':
                case 'o':
                    parseMain(event.shiftKey ? '#merge' : '#load');
                    event.preventDefault();
                    break;
                case 'S':
                case 's':
                    if(!event.shiftKey) {
                        parseMain('#save');
                        event.preventDefault();
                    }
                    break;
                case 'Z':
                case 'z':
                    if(!event.shiftKey) {
                        parseMain('#undo');
                        event.preventDefault();
                    }
                    break;
            }
            return;
        }
        if(document.activeElement.id === 'text_cui_form') {
            const target = document.cui_form.input.value; // target :: String
            switch(event.key) {
                case 'ArrowUp':
                    document.cui_form.input.value = History.up(target);
                    submitButtonControl();
                    event.preventDefault();
                    break;
                case 'ArrowDown':
                    document.cui_form.input.value = History.down(target);
                    submitButtonControl();
                    event.preventDefault();
                    break;
            }
        }
    });
    dgebi('notice').addEventListener('mouseenter', Notice.stopTimer);
    dgebi('notice').addEventListener('mouseleave', Notice.resumeTimer);

    // formCheck :: (Bool, String) -> ()
    const formCheck = (cond, id) => {
        dgebi(id).className = `background-color_${cond ? 'pink' : 'white'}`;
    };
    // setEvent :: (String, String -> Bool) -> ()
    const setEvent = (str, func) => {
        ['hour', 'minute', 'second'].map(x => `${str}_${x}`).forEach(x => {
            dgebi(x).addEventListener('input', event => {
                // value :: String
                const value = document.gui_form[event.target.id].value;
                // isValid :: Bool
                const isValid = func(value) || Number(value) < 0;
                formCheck(isValid, event.target.id);
            });
        });
    };
    setEvent('timer', x => isNaN(Number(x)));
    setEvent('alarm', x => !/^\d*$/.test(x));
    dgebi('gui_text').addEventListener('input', event => {
        formCheck(/;|->/.test(document.gui_form.gui_text.value), 'gui_text');
    });
    dgebi('cover').style.display = 'none';
    dgebi('body').style.overflow = 'auto';
    Sound.init();
    Task.init();
    const wait = UPDATE_TIME - Date.now() % UPDATE_TIME; // wait :: DateNumber
    window.setTimeout(window.setInterval, wait, (() => {
        let pre; // pre :: DateNumber
        let isSelected = false; // isSelected :: Bool

        return () => {
            dgebi('clock').innerText = toHms(new Date());
            Display.show();
            const subst = Date.now() - pre; // subst :: DateNumber
            TaskQueue.checkDeadline(Math.min(subst, 1000), Date.now());
            // isSelect :: Bool
            const isSelect = window.getSelection().toString().length > 0;
            if(!isSelected && isSelect) {
                isSelected = true;
            } else if(isSelected && !isSelect) {
                isSelected = false;
                Notice.resumeTimer();
            }
            pre = Date.now();
        }
    })(), UPDATE_TIME);
}, {once: true});

Load.exec();
