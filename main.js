'use strict';
const UPDATE_TIME = 200; // UPDATE_TIME :: DateNumber
const SEPARATOR = '\v'; // SEPARATOR :: String
const VERSION = [0, 4, 0]; // VERSION :: [VersionNumber]

// deadlineStr :: (DateNumber, DateNumber) -> DisplayString
const deadlineStr = (deadline, now) => {
    // deadlineObj :: Date;  nowObj :: Date
    const deadlineObj = new Date(deadline), nowObj = new Date(now);
    let ret = ''; // ret :: DisplayString
    if(Math.abs(deadline - now) >= 86400000) {
        if(Math.abs(deadline - now) >= 86400000 * 365) {
            ret = deadlineObj.getFullYear() + '-';
        }
        ret += `${deadlineObj.getMonth() + 1}-${deadlineObj.getDate()},`;
    }
    return ret + toHms(deadlineObj);
};

// toHms :: Date -> DisplayString
const toHms = obj => {
    // hms :: [Number]
    const hms = [obj.getHours(), obj.getMinutes(), obj.getSeconds()];
    return hms.map(x => ('0' + x).slice(-2)).join(':');
};

// dgebi :: IDString -> Maybe Element
const dgebi = id => document.getElementById(id);

// removeDom :: IDString -> Bool
const removeDom = id => {
    const target = dgebi(id); // target :: Maybe Element
    if(target === null) return false;
    target.parentNode.removeChild(target);
    return true;
};

// parameterCheck :: (ParameterString, IndexNumber) -> [DOMString]
const parameterCheck = (str, max) => {
    return str.split(' ').map(x => {
        const index = parseInt(x, 10); // index :: Maybe IndexNumber
        if(index > 0 && index <= max && /^\d+$/.test(x)) {
            return x;
        } else {
            return `<span class="red">${x}</span>`;
        }
    });
};

// getText :: () -> ()
const getText = () => {
    const input = document.cui_form.input.value; // input :: ExecString
    document.cui_form.input.value = '';
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
        if(strs.some(x => func(x) || Number(x) < 0)) {
            error();
            return false;
        }
        return true;
    };
    // makeMode :: FlagString -> String
    const makeMode = str => {
        return form.gui_sound.value + str + form.gui_importance.value;
    };
    if(form.task_type.value === 'timer') {
        const unit = ['h', 'm', 's']; // unit :: [String]
        // value :: [String]
        const value = timeUnit.map(x => form['timer_' + x].value);
        let main = '' // main :: String
        if(!isValid(x => isNaN(Number(x)), value)) return;
        [0, 1, 2].map(i => main += Number(value[i]) + unit[i]);
        ret.push(main, makeMode('t'));
    } else { // form.task_type.value === 'alarm'
        // value :: [String]
        const value = timeUnit.map(x => form['alarm_' + x].value);
        if(!isValid(x => !/^\d*$/.test(x), value)) return;
        ret.push(value.map(x => parseInt(x, 10)).join(':'), makeMode('a'));
    }
    if(form.gui_text.value !== '') {
        if(/;/.test(form.gui_text.value)) {
            error();
            return;
        }
        ret.push(form.gui_text.value);
    }
    parseMain(ret.join('/'));
};

// parseMain :: (ExecString, FlagString) -> ()
const parseMain = (() => {
    let idCount = 0; // idCount :: CountNumber
    let recursionCount = 0; // recursionCount :: CountNumber

    // evaluate :: ExecString -> ExecString
    const evaluate = str => {
        // safeEval :: String -> String
        const safeEval = str => {
            try {
                return Function(`'use strict';return(${str})`)();
            } catch(e) { // e :: Object
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
    // play :: (ParameterString, FlagString) -> ()
    const play = (parameter, callFrom) => {
        if(!/^(?:-|\d)$/.test(parameter)) {
            Notice.set(`error: sound <span class="red">${parameter}</span>`);
            return;
        }
        Sound.play(`sound/alarm${parameter}.mp3`, callFrom);
    }

    // main :: (ExecString, FlagString) -> ()
    const main = (text, callFrom) => {
        const isHeadHash = /^#/.test(text); // isHeadHash :: Bool
        const isHeadArrow = /^->/.test(text); // isHeadArrow :: Bool
        const isRawMode = isHeadHash || isHeadArrow; // isRawMode :: Bool
        if(isHeadHash) {
            text = text.slice(1);
        }
        if(Macro.isInsertSuccess(text)) return;
        if(!isRawMode) {
            text = Macro.replace(text);
            text = evaluate(text);
        }
        if(!isHeadArrow) {
            const texts = text.split(';'); // texts :: [ExecString]
            if(texts.length > 1) {
                recursionCount++;
                if(recursionCount > 5) throw 'too much recursion';
                texts.forEach(element => main(element, callFrom));
                recursionCount--;
                return;
            }
        }
        // spaceSplit :: Maybe [Maybe String]
        const spaceSplit = /^([^ ]*)(?: (.*))?$/.exec(text);
        // parameter :: ParameterString
        const parameter = spaceSplit[2] === undefined ? ''
                : spaceSplit[2].replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ');
        switch(spaceSplit[1]) {
            case 'switch':
                TaskQueue.setDisplay(parameter, '');
                return;
            case 'switch-alarm':
                TaskQueue.setDisplay(parameter, '-alarm');
                return;
            case 'switch-timer':
                TaskQueue.setDisplay(parameter, '-timer');
                return;
            case 'remove':
                TaskQueue.remove(parameter);
                return;
            case 'button':
                Button.insert(spaceSplit[2]);
                return;
            case '$button':
                Button.insertByData(spaceSplit[2]);
                return;
            case 'remove-button':
                Button.remove(parameter);
                return;
            case '->':
                Macro.insertByData(spaceSplit[2]);
                return;
            case 'show-macro':
                Macro.show();
                return;
            case 'hide-macro':
                Macro.hide();
                return;
            case 'remove-macro':
                Macro.remove(parameter);
                return;
            case 'sound':
                play(parameter, callFrom);
                return;
            case 'stop':
                Sound.stop(parameter);
                return;
            case 'volume':
                Sound.setVolume(parameter);
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
                window.open('help.html', '_blank');
                return;
        }
        const taskItem = Task.parse(text); // taskItem :: Maybe TaskObject
        if(taskItem === null) {
            if(text === '') return;
            Notice.set(`error: <span class="red">${text}</span>`);
            return;
        }
        TaskQueue.insert(taskItem);
        if(!taskItem.isValid) {
            Display.doStrike(taskItem.id, taskItem.importance);
        }
    };

    return (text, callFrom = 'global') => {
        try {
            Notice.clear();
            main(text, callFrom);
        } catch(e) { // e :: Object
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
    dgebi('label_radio_alarm').className = '';
    dgebi('alarm_setting').className = 'block';
    dgebi('label_radio_timer').className = 'gray';
    dgebi('timer_setting').className = 'none';
    dgebi('gui_other_setting').className = 'block';
};

// showTimerGUI :: () -> ()
const showTimerGUI = () => {
    dgebi('label_radio_timer').className = '';
    dgebi('timer_setting').className = 'block';
    dgebi('label_radio_alarm').className = 'gray';
    dgebi('alarm_setting').className = 'none';
    dgebi('gui_other_setting').className = 'block';
};

const BackgroundAlert = (() => {
    let semaphore = 0; // semaphore :: CountNumber

    return {
        // BackgroundAlert.on :: () -> ()
        on: () => {
            semaphore++;
            dgebi('body').className = 'bg-pink';
        },
        // BackgroundAlert.off :: () -> ()
        off: () => {
            semaphore--;
            if(semaphore > 0) return;
            dgebi('body').className = 'bg-white';
        }
    };
})();

const History = (() => {
    const strs = []; // strs :: [ExecString]
    let index = 0, tempStr = ''; // index :: IndexNumber;  tempStr :: ExecString

    return {
        // History.push :: ExecString -> ()
        push: str => {
            if(str === '') return;
            strs.push(str);
            if(index < strs.length - 1) {
                strs.splice(index, 1);
            }
            index = strs.length;
        },
        // History.up :: ExecString -> ExecString
        up: str => {
            if(index === strs.length) {
                tempStr = str;
            }
            if(index === 0) return strs.length === 0 ? tempStr : strs[0];
            index--;
            return strs[index];
        },
        // History.down :: ExecString -> ExecString
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
    let id = undefined; // id :: Maybe IDNumber

    return {
        // Notice.set :: DOMString -> ()
        set: html => {
            // target :: Element
            const target = dgebi('notice');
            if(id !== undefined) {
                window.clearTimeout(id);
                target.innerHTML += ' ; ';
            }
            target.innerHTML += html;
            id = window.setTimeout(Notice.clear, 5000);
        },
        // Notice.clear :: () -> ()
        clear: () => {
            dgebi('notice').innerHTML = '';
            window.clearTimeout(id);
            id = undefined;
        }
    };
})();

const Trash = (() => {
    const items = []; // items :: [SaveString]

    return {
        // Trash.push :: SaveString -> ()
        push: item => items.push(item),
        // Trash.pop :: () -> ()
        pop: () => {
            if(items.length === 0) {
                Notice.set('trash is empty');
                return;
            }
            items.pop().split(SEPARATOR).forEach(x => parseMain(x));
        },
        // Trash.reset :: () -> ()
        reset: () => items.length = 0
    }
})();

const Sound = (() => {
    const sounds = []; // sounds :: Map URLString Audio
    let volume = 100; // volume :: VolumeNumber

    return {
        // Sound.setVolume :: ParameterString -> ()
        setVolume: str => {
            const n = parseInt(str, 10); // n :: VolumeNumber
            if(n < 0 || n > 100 || !/^\d+$/.test(str)) {
                Notice.set(`error: volume <span class="red">${str}</span>`);
                return;
            }
            volume = n;
            TaskQueue.setVolume(volume / 100);
            dgebi('range_volume').value = volume;
            dgebi('volume').innerText = volume;
        },
        // Sound.init :: () ~-> ()
        init: () => {
            for(let i = 0; i < 10; i++) { // i :: IndexNumber
                const url = `sound/alarm${i}.mp3`; // url :: URLString
                sounds[url] = new Audio(url);
                sounds[url].muted = true;
                sounds[url].onloadeddata = e => sounds[url].play();
            }
        },
        // Sound.play :: (URLString, IDString) -> ()
        play: (url, id) => {
            if(sounds[url] === undefined || sounds[url].readyState < 2) return;
            const sound = new Audio(); // sound :: Audio
            sound.src = sounds[url].src;
            sound.volume = volume / 100;
            sound.currentTime = 0;
            sound.play();
            const isPlay = TaskQueue.isPlay(id); // isPlay :: Bool
            // soundId :: IDNumber
            const soundId = TaskQueue.setSound(sound, id);
            sound.addEventListener('ended', () => {
                TaskQueue.removeSound(id, soundId);
                if(TaskQueue.isPlay(id)) return;
                removeDom('stopButton_' + id);
            }, {once: true});
            if(isPlay) return;
            dgebi('item_' + id).innerHTML +=
                    `<input id="stopButton_${id}" type="button" value="stop" onclick="parseMain('#stop $${id}');">`;
        },
        // Sound.stop :: ParameterString -> ()
        stop: id => TaskQueue.stopSound(id),
        // Sound.save :: () -> [ExecString]
        save: () => ['volume ' + volume]
    };
})();

const Task = (() => {
    let defaultSound = '0'; // defaultSound :: SoundFlagString
    let defaultImportance = 0; // defaultImportance :: ImportanceFlagNumber
    let defaultDisplay = 'a'; // defaultDisplay :: DisplayFlagString

    // importanceStr :: () -> ImportanceFlagString
    const importanceStr = () => ['.', '!', '!!', '!!!'][defaultImportance];
    // importanceToNumber :: ImportanceFlagString -> ImportanceFlagNumber
    const importanceToNumber = str => str === '.' ? 0 : str.length;
    // timer :: (TimerString, DateNumber) -> Maybe DateNumber
    const timer = (s, now) => {
        // regex :: RegExp
        const regex = /^((?:(\d+),)?(\d*?)(\d{0,2})(?:\.(\d+))?)$|^((?:(.*)d)?(?:(.*)h)?(?:(.*)m)?(?:(.*)s)?)$/;
        const result = regex.exec(s); // result :: Maybe [Maybe String]
        if(s === '' || result === null) return null;
        let ret = 0; // ret :: DateNumber
        // correct : IndexNumber
        const correct = result[1] !== undefined ? 2 : 7;
        const table = [86400, 3600, 60, 1]; // table :: Number
        for(let i = 0; i < 4; i++) { // i :: IndexNumber
            if(result[i + correct] !== undefined) {
                // value :: MaybeNumber
                const value = Number('0' + result[i + correct], 10);
                if(isNaN(value)) return null;
                ret += table[i] * value;
            }
        }
        return now + 1000 * ret;
    };
    // alarm :: (AlarmString, DateNumber) -> Maybe DateNumber
    const alarm = (s, now) => {
        // regex :: RegExp
        const regex = /^(?:(?:(\d*)-)?(\d*)-(\d*),)?(\d*):(\d*)(?::(\d*))?$/;
        const result = regex.exec(s); // result :: Maybe [Maybe String]
        if(result === null) return null;
        let ret = new Date(now); // ret :: Date
        let isFind = false; // isFind :: Bool
        const isFree = []; // isFree :: [Number]
        // table :: [Object]
        const table =
                [{get: 'getFullYear', set: 'setFullYear', c: 0, r: 0}
                , {get: 'getMonth', set: 'setMonth', c: -1, r: 0}
                , {get: 'getDate', set: 'setDate', c: 0, r: 1}
                , {get: 'getHours', set: 'setHours', c: 0, r: 0}
                , {get: 'getMinutes', set: 'setMinutes', c: 0, r: 0}
                , {get: 'getSeconds', set: 'setSeconds', c: 0, r: 0}];
        ret.setMilliseconds(500);
        for(let i = 0; i < 6; i++) { // i :: IndexNumber
            const t = table[i]; // t :: Object
            if(result[i + 1] !== '' && result[i + 1] !== undefined) {
                ret[t.set](parseInt(result[i + 1], 10) + t.c);
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
        // Task.setDefault :: Maybe ConfigString -> ()
        setDefault: str => {
            if(str !== '') {
                // result :: Maybe [Maybe String]
                const result = /^([-\d]?)([ast]?)(\.|!{1,3})?$/.exec(str);
                if(result !== null) {
                    if(result[1] !== '') {
                        defaultSound = result[1];
                    }
                    if(result[2] !== null) {
                        defaultDisplay = result[2] !== 's' ? result[2]
                                : defaultDisplay === 'a' ? 't' : 'a';
                    }
                    if(result[3] !== undefined) {
                        defaultImportance = importanceToNumber(result[3]);
                    }
                }
            }
            Notice.set('default: ' + defaultSound + defaultDisplay
                    + importanceStr());
            return;
        },
        // Task.parse :: ExecString -> Maybe TaskObject
        parse: s => {
            // regex :: RegExp
            const regex = /^(?:(\d+)([at]))?([^\/]*)((?:\/(?:([-\d])|([^\/]*?)\*)??([at])?(\.|!{1,3})?(?:\/(.*))?)?)$/;
            const result = regex.exec(s); // result :: Maybe [Maybe String]
            const ret = new Object(); // ret :: TaskObject
            const execs = []; // execs :: [ExecString]
            if(result === null) return null;
            // now :: DateNumber
            const now = result[1] !== undefined ? parseInt(result[1], 10)
                    : Date.now();
            if(result[1] !== undefined) {
                ret.when = result[1];
                ret.display = result[2];
            } else {
                ret.when = String(now);
                ret.display = defaultDisplay;
            }
            // plusSplit :: Maybe [Maybe String]
            const plusSplit = /^([^\+]*?)(?:\+(.*))?$/.exec(result[3]);
            ret.deadline = timer(plusSplit[1], now);
            if(ret.deadline === null) {
                ret.deadline = alarm(plusSplit[1], now);
                if(ret.deadline === null) return null;
            }
            ret.isValid = ret.deadline - Date.now() >= -UPDATE_TIME / 2;
            ret.saveText = result[3];
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
            ret.saveText += '/';
            if(result[5] !== undefined) {
                execs.push('#sound ' + result[5]);
                ret.saveText += result[5];
            } else if(result[6] !== undefined) {
                execs.push(result[6]);
                ret.saveText += result[6] + '*';
            } else {
                execs.push('#sound ' + defaultSound);
                ret.saveText += defaultSound;
            }
            ret.display = result[7] !== undefined ? result[7] : ret.display;
            if(result[8] !== undefined) {
                ret.importance = importanceToNumber(result[8]);
                ret.saveText += result[8];
            } else {
                ret.importance = defaultImportance;
                ret.saveText += importanceStr();
            }
            if(result[9] !== undefined) {
                ret.name = result[9];
                ret.saveText += '/' + result[9];
            } else {
                ret.name = plusSplit[1];
            }
            ret.exec = execs.join(';');
            ret.tipText = ret.saveText;
            return ret;
        },
        // Task.init :: () -> ()
        init: () => {
            // soundElements :: [Element]
            const soundElements = dgebi('gui_sound').childNodes;
            for(let i = 0; i < soundElements.length; i++) { // i :: IndexNumber
                if(soundElements[i].value === defaultSound) {
                    soundElements[i].selected = true;
                    break;
                }
            }
            // importanceElements :: [Element]
            const importanceElements = dgebi('gui_importance').childNodes;
            // i :: IndexNumber
            for(let i = 0; i < importanceElements.length; i++) {
                if(importanceElements[i].value === importanceStr()) {
                    importanceElements[i].selected = true;
                    break;
                }
            }
        },
        // Task.save :: () -> [ExecString]
        save: () => {
            return ['default ' + defaultSound + defaultDisplay
                    + importanceStr()];
        }
    };
})();

const Base64 = (() => {
    // KEY :: Base64String
    const KEY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

    return {
        // Base64.encode :: SaveString -> Base64String
        encode: str => {
            str = encodeURIComponent(str);
            const ret = []; // ret :: Base64Number
            for(let i = 0; i < str.length; i += 3) { // i :: IndexNumber
                // c :: [Maybe UnicodeNumber]
                const c = [0, 1, 2].map(x => str.charCodeAt(i + x));
                ret.push(c[0] >> 2);
                const t1 = (c[0] & 3) << 4; // t1 :: UnicodeNumber
                if(isNaN(c[1])) {
                    ret.push(t1, 64, 64);
                } else {
                    ret.push(t1 | (c[1] >> 4))
                    const t2 = (c[1] & 15) << 2; // t2 :: UnicodeNumber
                    if(isNaN(c[2])) {
                        ret.push(t2, 64);
                    } else {
                        ret.push(t2 | (c[2] >> 6), c[2] & 63);
                    }
                }
            }
            return ret.map(x => KEY[x]).join('');
        },
        // Base64.decode :: Base64String -> SaveString
        decode: str => {
            str = str.replace(/[^A-Za-z\d+/=]/g, '');
            const ret = []; // ret :: UnicodeNumber
            for(let i = 0; i < str.length; i += 4) { // i :: IndexNumber
                // c :: [Base64Number]
                const c = [0, 1, 2, 3].map(x => KEY.indexOf(str.charAt(i + x)));
                ret.push((c[0] << 2) | (c[1] >> 4));
                if(c[2] < 64) {
                    ret.push(((c[1] & 15) << 4) | (c[2] >> 2));
                    if(c[3] < 64) {
                        ret.push(((c[2] & 3) << 6) | c[3]);
                    }
                }
            }
            return decodeURIComponent(ret.map(x => String.fromCharCode(x))
                                         .join(''));
        }
    }
})();

const Save = (() => {
    // makeData :: () -> SaveString
    const makeData = () => {
        return [Legacy, TaskQueue, Button, Display, Sound, Task, Macro]
                .map(x => x.save()).flat().join(SEPARATOR);
    };

    return  {
        // Save.exec :: () -> ()
        exec: () => window.localStorage.setItem('data', makeData()),
        // Save.toString :: () -> ()
        toString: () => {
            window.prompt('セーブデータ:', Base64.encode(makeData()));
        }
    };
})();

const Load = (() => {
    // parse :: SaveString -> ()
    const parse = data => {
        const rest = data.split(SEPARATOR); // rest :: SaveString
        const version = rest.shift(); // version :: String
        if(Legacy.isPast(version)) {
            Legacy.convert(rest, version).forEach(x => parseMain(x));
            Notice.set('new version ' + VERSION.join('.'));
        } else {
            rest.forEach(x => parseMain(x));
        }
    };

    return {
        // Load.exec :: () -> ()
        exec: () => {
            // data :: Maybe SaveString
            const data = window.localStorage.getItem('data');
            if(data === null) {
                dgebi('menu_details').open = true;
                dgebi('document_details').open = true;
                return;
            }
            parse(data);
        },
        // Load.fromString :: () -> ()
        fromString: () => {
            // text :: Maybe Base64String
            const text = window.prompt('読み込むデータを入れてください:', '');
            if(text === '' || text === null) return;
            parseMain('##remove-macro *;remove *;remove-button *;default 0a.;\
                    volume 100;show-menu;hide-macro;empty-trash;empty-history');
            parse(Base64.decode(text));
            Notice.set('data loaded');
        }
    };
})();

const Button = (() => {
    let buttonCount = 0; // buttonCount :: CountNumber
    const buttons = []; // buttons :: [ButtonObject]

    // rm :: [IDNumber] -> ()
    const rm = ids => {
        if(ids.length === 0) return;
        // items :: [MacroObject]
        const items = ids.map(id => buttons.find(x => x.id === id));
        Trash.push(items.map(item => '#' + item.saveText).join(SEPARATOR));
        ids.forEach(id => {
            removeDom('button_' + id);
            buttons.splice(buttons.findIndex(x => x.id === id), 1);
        });
    };

    return {
        // Button.insert :: (ExecString, DateNumber) -> ()
        insert: (str, now = null) => {
            if(str === undefined) return;
            // execStr :: ExecString
            const execStr = str.replace(/'/g, '\\\'').replace(/\\/g, '\\\\');
            if(now === null) {
                now = Date.now();
            }
            // buttonItem :: ButtonObject
            const buttonItem = {id: buttonCount, str: str, time: now
                    , saveText: `$button ${now}#${str}`};
            buttonCount++;
            // newElement :: Element
            const newElement = document.createElement('span');
            newElement.innerHTML =
                    `<input type="button" value="${str}" onclick="parseMain('${execStr}');"> `;
            newElement.setAttribute('id', 'button_' + buttonItem.id);
            // i :: IndexNumber
            const i = buttons.findIndex(x => x.time > buttonItem.time);
            if(i >= 0) {
                // target :: Element
                const target = dgebi('button_' + buttons[i].id);
                target.parentNode.insertBefore(newElement, target);
                buttons.splice(i, 0, buttonItem);
            } else {
                dgebi('button_parent').appendChild(newElement);
                buttons.push(buttonItem);
            }
        },
        // Button.insertByData :: ParameterString -> ()
        insertByData: str => {
            // result :: Maybe [Maybe String]
            const result = /^(\d+)#(.+)$/.exec(str);
            Button.insert(result[2], parseInt(result[1], 10));
        },
        // Button.remove :: ParameterString -> ()
        remove: str => {
            switch(str) {
                case '':
                    return;
                case '*':
                    rm(buttons.map(x => x.id));
                    return;
            }
            // strs :: [DOMString]
            const strs = parameterCheck(str, buttons.length);
            rm([...new Set(strs.filter(x => /^\d/.test(x))
                   .map(i => buttons[parseInt(i, 10) - 1].id))]);
            if(strs.some(x => !/^\d/.test(x))) {
                Notice.set('error: remove-button ' + strs.join(' '));
            }
        },
        // Button.save :: () -> [ExecString]
        save: () => buttons.map(x => x.saveText)
    };
})();

const Display = (() => {
    let isShowMenu = true; // isShowMenu :: Bool

    return {
        // Display.show :: () -> ()
        show: () => TaskQueue.show(),
        // Display.doStrike :: (IDString, ImportanceFlagNumber) -> ()
        doStrike: (id, importance) => {
            // target :: Element
            const target = dgebi('text_' + id);
            target.className = 'strike';
            switch(importance) {
                case 3:
                    window.setTimeout(window.alert, 1000, target.innerText);
                case 2:
                    target.className += ' bg-red';
                    BackgroundAlert.on();
                    break;
                case 1:
                    target.className += ' bg-yellow';
                    break;
                case 0:
                    window.setTimeout(parseMain, 15000, '#remove $' + id);
                    break;
            }
        },
        // Display.showMenu :: () -> ()
        showMenu: () => {
            dgebi('menu').className = 'inline-block';
            isShowMenu = true;
        },
        // Display.hideMenu :: () -> ()
        hideMenu: () => {
            dgebi('menu').className = 'none';
            isShowMenu = false;
        },
        // Display.save :: () -> [ExecString]
        save: () => [isShowMenu ? 'show-menu' : 'hide-menu']
    };
})();

const Macro = (() => {
    const regex = /^([^;]*?)->(.*)$/; // regex :: RegExp
    const macros = []; // macros :: [MacroObject]
    let macroCount = 0; // macroCount :: CountNumber
    let isListShow = false; // isListShow :: Bool

    // formatter :: ExecString -> DisplayString
    const formatter = s => s.replace(regex, '$1 -> $2');
    // rm :: [IDNumber] -> ()
    const rm = ids => {
        if(ids.length === 0) return;
        // items :: [MacroObject]
        const items = ids.map(id => macros.find(x => x.id === id));
        Trash.push(items.map(item => item.saveText).join(SEPARATOR));
        if(!isListShow) {
            Notice.set('removed: ' + items.map(item => item.str).join(' , '));
        }
        ids.forEach(id => {
            removeDom('macro_' + id);
            macros.splice(macros.findIndex(x => x.id === id), 1);
        });
    };

    return {
        // Macro.isInsertSuccess :: (ExecString, DateNumber) -> Bool
        isInsertSuccess: (s, now = null) => {
            const result = regex.exec(s); // result :: Maybe [Maybe String]
            if(result === null || result[1] === '') return false;
            const id = macroCount; // id :: IDNumber
            macroCount++;
            const isNull = now === null; // isNull :: Bool
            if(isNull) {
                now = Date.now();
            }
            // macroItem :: MacroObject
            const macroItem = {key: new RegExp(result[1], 'gu'), str: s
                    , value: result[2], id: id, time: now
                    , saveText: `-> ${now}#${s}`};
            // newElement :: Element
            const newElement = document.createElement('li');
            const formatStr = formatter(s); // formatStr :: DisplayString
            newElement.innerHTML =
                    `<input type="button" value="remove" onclick="parseMain('#remove-macro $${id}');"> ${formatStr}`;
            newElement.setAttribute('id', 'macro_' + id);
            // i :: IndexNumber
            const i = macros.findIndex(x => x.time > macroItem.time);
            if(i >= 0) {
                // target :: Element
                const target = dgebi('macro_' + macros[i].id);
                target.parentNode.insertBefore(newElement, target);
                macros.splice(i, 0, macroItem);
            } else {
                dgebi('macro_parent').appendChild(newElement);
                macros.push(macroItem);
            }
            if(!isListShow && isNull) {
                Notice.set('macro: ' + formatStr);
            }
            return true;
        },
        // Macro.insertByData :: ParameterString -> ()
        insertByData: str => {
            // result :: Maybe [Maybe String]
            const result = /^(\d+)#(.+)$/.exec(str);
            Macro.isInsertSuccess(result[2], parseInt(result[1], 10));
        },
        // Macro.replace :: ExecString -> ExecString
        replace: s => {
            macros.forEach(x => s = s.replace(x.key, x.value));
            return s;
        },
        // Macro.remove :: ParameterString -> ()
        remove: str => {
            switch(str) {
                case '':
                    return;
                case '*':
                    rm(macros.map(x => x.id));
                    return;
            }
            // idResult :: Maybe [Maybe String]
            const idResult = /^\$(\d+)$/.exec(str);
            if(idResult !== null) {
                rm([parseInt(idResult[1], 10)]);
                return;
            }
            // strs :: [DOMString]
            const strs = parameterCheck(str, macros.length);
            rm([...new Set(strs.filter(x => /^\d/.test(x))
                   .map(i => macros[parseInt(i, 10) - 1].id))]);
            if(strs.some(x => !/^\d/.test(x))) {
                Notice.set('error: remove-macro ' + strs.join(' '));
            }
        },
        // Macro.show :: () -> ()
        show: () => {
            dgebi('macros').className = 'block';
            isListShow = true;
        },
        // Macro.hide :: () -> ()
        hide: () => {
            dgebi('macros').className = 'none';
            isListShow = false;
        },
        // Macro.save :: () -> [ExecString]
        save: () => {
            return [isListShow ? 'show-macro' : 'hide-macro'
                    , ...macros.map(x => x.saveText)];
        }
    };
})();

const TaskQueue = (() => {
    const taskQueue = []; // taskQueue :: [TaskObject]
    let idCount = 0; // idCount :: CountNumber

    taskQueue[-1] = {id: 'global', sound: [], soundCount: 0};

    // getIndexById :: IDString -> Maybe IndexNumber
    const getIndexById = id => {
        for(let i = -1; i < taskQueue.length; i++) { // i :: IndexNumber
            if(taskQueue[i].id === id) return i;
        }
        return undefined;
    };
    // makeSaveText :: TaskObject -> SaveString
    const makeSaveText = obj => obj.when + obj.display + obj.saveText;
    // display :: ([IDString], FlagString) -> ()
    const display = (ids, flag) => {
        if(ids.length === 0) return;
        // func :: FlagString -> FlagString
        const func = flag === '-alarm' ? (x => 'a')
                : flag === '-timer' ? (x => 't') : (x => x === 'a' ? 't' : 'a');
        ids.forEach(id => {
            const i = taskQueue.findIndex(x => x.id === id); // i :: IndexNumber
            taskQueue[i].display = func(taskQueue[i].display);
        });
    };
    // rm :: [IDString] -> ()
    const rm = ids => {
        // items :: [TaskObject]
        const items = ids.map(id => taskQueue.find(x => x.id === id))
                         .filter(x => x !== undefined);
        if(items.length === 0) return;
        Trash.push(items.map(item => '#' + makeSaveText(item)).join(SEPARATOR));
        ids.forEach(id => {
            TaskQueue.stopSound('$' + id);
            removeDom('item_' + id);
            const i = taskQueue.findIndex(x => x.id === id); // i :: IndexNumber
            if(!taskQueue[i].isValid && taskQueue[i].importance > 1) {
                BackgroundAlert.off();
            }
            taskQueue.splice(i, 1);
        });
    };
    // stop :: [IDString] -> ()
    const stop = ids => {
        if(ids.length === 0) return;
        ids.forEach(id => {
            removeDom('stopButton_' + id);
            const index = getIndexById(id); // index :: Maybe IndexNumber
            taskQueue[index].sound.forEach(x => x.pause());
            taskQueue[index].sound = [];
        });
    };

    return {
        // TaskQueue.setDisplay :: (ParameterString, FlagString) -> ()
        setDisplay: (str, flag) => {
            if(str === '' || str === '*') {
                display(taskQueue.map(x => x.id), flag);
                return;
            }
            // strs :: [DOMString]
            const strs = parameterCheck(str, taskQueue.length);
            display([...new Set(strs.filter(x => /^\d/.test(x))
                   .map(i => taskQueue[parseInt(i, 10) - 1].id))], flag);
            if(strs.some(x => !/^\d/.test(x))) {
                Notice.set(`error: switch${flag} ${strs.join(' ')}`);
            }
        },
        remove: str => {
            // idResult :: Maybe [Maybe String]
            const idResult = /^\$(\d+)$/.exec(str);
            if(idResult !== null) {
                rm([idResult[1]]);
                return;
            }
            // strs :: [DOMString]
            const strs = parameterCheck(str, taskQueue.length);
            rm([...new Set(strs.filter(x => /^\d/.test(x))
                   .map(i => taskQueue[parseInt(i, 10) - 1].id))]);
            if(strs.some(x => !/^\d/.test(x))) {
                Notice.set('error: remove ' + strs.join(' '));
            }
        },
        // TaskQueue.setSound :: (Sound, IDString) -> IDNumber
        setSound: (sound, id) => {
            const index = getIndexById(id); // index :: Maybe IndexNumber
            const count = taskQueue[index].soundCount; // count :: IDNumber
            sound.soundId = count;
            taskQueue[index].sound.push(sound);
            taskQueue[index].soundCount++;
            return count;
        },
        // TaskQueue.setVolume :: VolumeNumber -> ()
        setVolume: volume => {
            for(let i = -1; i < taskQueue.length; i++) { // i :: IndexNumber
                const sound = taskQueue[i].sound; // sound :: Maybe Sound
                if(sound === undefined) continue;
                sound.forEach(x => x.volume = volume);
            }
        },
        // TaskQueue.isPlay :: IDString -> Bool
        isPlay: id => {
            const ret = taskQueue[getIndexById(id)]; // ret :: Maybe TaskObject
            return ret !== undefined && ret.sound.length > 0;
        },
        // TaskQueue.insert :: TaskObject -> ()
        insert: taskItem => {
            const id = idCount; // id :: IDNumber
            idCount++;
            taskItem.id = String(id);
            taskItem.sound = [];
            taskItem.soundCount = 0;
            // newElement :: Element
            const newElement = document.createElement('li');
            newElement.innerHTML =
                    `<input type="button" value="remove" onclick="parseMain('#remove $${id}');"> <span id="text_${id}" title="${taskItem.tipText}">${taskItem.name}</span><span id="time_${id}"></span> `;
            newElement.setAttribute('id', 'item_' + id);
            // i :: IndexNumber
            const i = taskQueue.findIndex(x => x.deadline > taskItem.deadline);
            if(i >= 0) {
                // target :: Element
                const target = dgebi('item_' + taskQueue[i].id);
                target.parentNode.insertBefore(newElement, target);
                taskQueue.splice(i, 0, taskItem);
            } else {
                dgebi('parent').appendChild(newElement);
                taskQueue.push(taskItem);
            }
        },
        // TaskQueue.remove :: ParameterString -> ()
        remove: str => {
            switch(str) {
                case '':
                    rm(taskQueue.filter(x => !x.isValid).map(x => x.id));
                    return;
                case '*':
                    rm(taskQueue.map(x => x.id));
                    return;
            }
            // idResult :: Maybe [Maybe String]
            const idResult = /^\$(\d+)$/.exec(str);
            if(idResult !== null) {
                rm([idResult[1]]);
                return;
            }
            // strs :: [DOMString]
            const strs = parameterCheck(str, taskQueue.length);
            rm([...new Set(strs.filter(x => /^\d/.test(x))
                   .map(i => taskQueue[parseInt(i, 10) - 1].id))]);
            if(strs.some(x => !/^\d/.test(x))) {
                Notice.set('error: remove ' + strs.join(' '));
            }
        },
        // TaskQueue.stopSound :: IDString -> ()
        stopSound: str => {
            switch(str) {
                case '':
                case '$global':
                    stop(['global']);
                    return;
                case '*':
                    stop(['global', ...taskQueue.map(x => x.id)]);
                    return;
            }
            // idResult :: Maybe [Maybe String]
            const idResult = /^\$(\d+)$/.exec(str);
            if(idResult !== null) {
                stop([idResult[1]]);
                return;
            }
            stop([...new Set(str.split(' ').filter(x => {
                const index = parseInt(x, 10); // index :: Maybe IndexNumber
                return index > 0 && index <= taskQueue.length
                        && /^\d+$/.test(x);
            }).map(i => taskQueue[parseInt(i, 10) - 1].id))]);
        },
        // TaskQueue.removeSound :: (IDString, IDNumber) -> ()
        removeSound: (id, soundId) => {
            const index = getIndexById(id); // index :: Maybe IndexNumber
            if(index === undefined) return;
            taskQueue[index].sound.splice(taskQueue[index].sound
                    .findIndex(x => x.soundId === soundId), 1);
        },
        // TaskQueue.checkDeadline :: (DateNumber, now) -> ()
        checkDeadline: (interval, now) => {
            // i :: IndexNumber
            for(let i = 0; taskQueue[i] !== undefined
                    && now - taskQueue[i].deadline >= -interval / 2; i++) {
                if(taskQueue[i].isValid) {
                    taskQueue[i].isValid = false;
                    parseMain(taskQueue[i].exec, taskQueue[i].id);
                    Display.doStrike(taskQueue[i].id, taskQueue[i].importance);
                }
            }
        },
        // TaskQueue.show :: () -> ()
        show: () => {
            // dlStr :: (DateNumber, DateNumber) -> DisplayString
            const dlStr = (deadline, now) => `(${deadlineStr(deadline, now)})`;
            // restStr :: (DateNumber, DateNumber) -> DisplayString
            const restStr = (deadline, now) => {
                const r = (deadline - now) / 1000; // r :: DateNumber
                const d = Math.floor(r / 86400); // d :: Number
                // ret :: DisplayString
                const ret = [(r % 86400) / 3600, (r % 3600) / 60, r % 60]
                        .map(x => ('0' + Math.floor(x)).slice(-2)).join(':');
                return d > 0 ? `[${d},${ret}]` : `[${ret}]`;
            };
            const now = Date.now(); // now :: DateNumber
            taskQueue.forEach(x => {
                // target :: Element
                dgebi('time_' + x.id).innerText = !x.isValid
                        ? '@' + deadlineStr(x.deadline, now)
                        : x.display === 'a'
                            ? dlStr(x.deadline, now)
                            : restStr(x.deadline, now);
            });
        },
        // TaskQueue.save :: () -> [ExecString]
        save: () => taskQueue.map(x => makeSaveText(x))
    };
})();

const Legacy = (() => {
    // parseVersion :: VersionString -> [VersionNumber]
    const parseVersion = version => {
        // result :: Maybe [Maybe String]
        const result = /^ver (\d+)\.(\d+)\.(\d+)$/.exec(version);
        return [result[1], result[2], result[3]].map(x => parseInt(x, 10));
    };

    return {
        // Legacy.isPast :: VersionString -> Bool
        isPast: version => parseVersion(version) < VERSION,
        // Legacy.convert :: ([ExecString], VersionString) -> [ExecString]
        convert: (data, version) => {
            // inputVer :: [VersionNumber]
            const inputVer = parseVersion(version);
            let isChecked = false; // isChecked :: Bool
            if(isChecked || inputVer < [0, 3, 0]) {
                isChecked = true;
                // display :: Bool
                const display = data.filter(x => /^switch .*$/.test(x))[0]
                        === 'switch alarm' ? 'a' : 't';
                // regex :: RegExp
                const regex = /^(\d+)#([^\/]*(?:\/(?:[-\d]|[^\/]*?\*)??(?:\.|!{1,3})?(?:\/.*)?)?)$/;
                data = data.map(x => x.replace(regex, `$1${display}$2`));
            }
            return data;
        },
        // Legacy.save :: () -> [ExecString]
        save: () => ['ver ' + VERSION.join('.')]
    };
})();

dgebi('cover').addEventListener('click', () => {
    window.addEventListener('click', event => {
        const str = window.getSelection().toString(); // str :: DisplayString
        if(str.length > 0 && str !== '\n') return;
        let target = event.target; // target :: Maybe Element
        while(target !== null) {
            if(target.id === 'menu'
                    || (target.tagName === 'INPUT'
                    && target.type === 'button')) {
                return;
            }
            target = target.parentNode;
        }
        document.cui_form.input.focus();
    });
    dgebi('range_volume').addEventListener('input', () => {
        parseMain('#volume ' + dgebi('range_volume').value)
    });
    window.addEventListener('keydown', event => {
        if(event.ctrlKey) {
            switch(event.key) {
                case 'o':
                    parseMain('#load');
                    event.preventDefault();
                    break;
                case 's':
                    parseMain('#save');
                    event.preventDefault();
                    break;
                case 'z':
                    parseMain('#undo');
                    event.preventDefault();
                    break;
            }
            return;
        }
        if(document.activeElement.id === 'text_cui_form') {
            switch(event.key) {
                case 'ArrowUp':
                    document.cui_form.input.value =
                            History.up(document.cui_form.input.value);
                    event.preventDefault();
                    break;
                case 'ArrowDown':
                    document.cui_form.input.value =
                            History.down(document.cui_form.input.value);
                    event.preventDefault();
                    break;
            }
        }
    });
    // formCheck :: (Bool, StringID) -> ()
    const formCheck = (cond, id) => {
        dgebi(id).className = cond ? 'bg-pink' : 'bg-white';
    };
    ['timer_hour', 'timer_minute', 'timer_second'].map(x => {
        dgebi(x).addEventListener('input', event => {
            // value :: String
            const value = document.gui_form[event.target.id].value;
            // isValid :: Bool
            const isValid = isNaN(Number(value)) || Number(value) < 0;
            formCheck(isValid, event.target.id);
        });
    });
    ['alarm_hour', 'alarm_minute', 'alarm_second'].map(x => {
        dgebi(x).addEventListener('input', event => {
            // value :: String
            const value = document.gui_form[event.target.id].value;
            // isValid :: Bool
            const isValid = !/^\d*$/.test(value) || Number(value) < 0;
            formCheck(isValid, event.target.id);
        });
    });
    dgebi('gui_text').addEventListener('input', event => {
        formCheck(/;/.test(document.gui_form.gui_text.value), 'gui_text');
    });
    dgebi('cover').className = 'none';
    dgebi('body').className = 'of_auto';
    Sound.init();
    Task.init();
    window.setTimeout(window.setInterval, 200 - Date.now() % 200, (() => {
        let pre; // pre :: DateNumber

        return () => {
            dgebi('clock').innerText = toHms(new Date());
            Display.show();
            const subst = Date.now() - pre; // subst :: DateNumber
            TaskQueue.checkDeadline(subst > 1000 ? 1000 : subst, Date.now());
            pre = Date.now();
        }
    })(), UPDATE_TIME);
}, {once: true});

Load.exec();
