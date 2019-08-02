'use strict';
const UPDATE_TIME = 200; // UPDATE_TIME :: DateNumber
const SEPARATOR = '\v'; // SEPARATOR :: String

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

// getText :: () -> ()
const getText = () => {
    const input = document.cui_form.input.value; // input :: ExecString
    document.cui_form.input.value = '';
    History.push(input);
    parseMain(input);
};

// parseMain :: (ExecString, FlagString) -> ()
const parseMain = (() => {
    let idCount = 0; // idCount :: CountNumber
    let recursionCount = 0; // recursionCount :: CountNumber

    /* instNumbersParse :: (ExecString, ParameterString, Object, a -> ()
            , () -> (), ParameterString -> ()) -> () */
    const instNumbersParse =
            (inst, str, obj, method, methodAll, toTrash = null) => {
        if(str === '*') {
            if(toTrash !== null) {
                toTrash('*');
            }
            methodAll();
            return;
        }
        const noSet = [...new Set(str.split(' '))]; // noSet :: [String]
        // ids :: [a]
        const ids = noSet.filter(x => /^\d+$/.test(x))
                         .map(x => obj.getIdByIndex(parseInt(x, 10) - 1));
        if(toTrash !== null) {
            toTrash(ids.join(' '));
        }
        ids.forEach(x => method(x));
        if(noSet.some(x => /\D/.test(x))) {
            Notice.set(`parse error: ${inst} ${
                    noSet.map(x => x.replace(/^(\d*\D.*)$/
                            , '<span class="red">$1</span>'))
                         .join(' ')}`);
        }
    };
    /* isIdCall :: (IDString -> (), ParameterString, ParameterString -> ())
            -> Bool */
    const isIdCall = (method, str, toTrash = null) => {
        const result = /^\$(\d+)$/.exec(str); // result :: Maybe [Maybe String]
        if(result === null) return false
        if(toTrash !== null) {
            toTrash(result[1]);
        }
        method(result[1]);
        return true;
    };
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

    // main :: (ExecString, FlagString) -> ()
    const main = (text, callFrom) => {
        // hashResult :: Maybe [Maybe String]
        const hashResult = /^#(.*)$/.exec(text);
        // arrowResult :: Maybe [Maybe String]
        const arrowResult = /^->(.*)$/.exec(text);
        let isRawMode = false; // isRawMode :: Bool
        let isHeadArrow = false; // isHeadArrow :: Bool
        if(hashResult !== null) {
            text = hashResult[1];
            isRawMode = true;
        } else if(arrowResult !== null) {
            isHeadArrow = true;
            isRawMode = true;
        }
        if(Macro.isInsertSuccess(text)) return;
        if(!isRawMode) {
            text = Macro.replace(text);
            text = evaluate(text);
        }
        if(!isHeadArrow) {
            const texts = text.split(';');
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
        switch(spaceSplit[1]) {
            case 'switch':
                Display.setMode(spaceSplit[2]);
                return;
            case 'remove':
                if(spaceSplit[2] === undefined) {
                    TaskQueue.removeAlerted();
                    return;
                }
                if(isIdCall(TaskQueue.remove, spaceSplit[2]
                        , TaskQueue.moveToTrash)) return;
                instNumbersParse('remove', spaceSplit[2], TaskQueue
                        , TaskQueue.remove, TaskQueue.removeAll
                        , TaskQueue.moveToTrash);
                return;
            case 'button':
                if(spaceSplit[2] === undefined || spaceSplit[2] === '') return;
                Button.insert(spaceSplit[2]);
                return;
            case '$button':
                Button.insertByData(spaceSplit[2]);
                return;
            case 'remove-button':
                instNumbersParse('remove-button', spaceSplit[2], Button
                        , Button.remove, Button.removeAll, Button.moveToTrash);
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
                if(isIdCall(x => Macro.remove(parseInt(x, 10)), spaceSplit[2]
                        , Macro.moveToTrash)) return;
                instNumbersParse('remove-macro', spaceSplit[2], Macro
                        , Macro.remove, Macro.removeAll, Macro.moveToTrash);
                return;
            case 'sound':
                if(!/^\d$/.test(spaceSplit[2])) return;
                Sound.play(`sound/alarm${spaceSplit[2]}.mp3`, callFrom);
                return;
            case 'stop':
                if(spaceSplit[2] === undefined || spaceSplit[2] === '$global') {
                    Sound.stop('global');
                    return;
                }
                if(isIdCall(Sound.stop, spaceSplit[2])) return;
                instNumbersParse('stop', spaceSplit[2], TaskQueue, Sound.stop
                        , Sound.stopAll);
                return;
            case 'volume':
                const volume = parseInt(spaceSplit[2], 10);
                if(volume >= 0 && volume <= 100) {
                    Sound.setVolume(volume);
                }
                return;
            case 'default':
                Task.setDefault(spaceSplit[2]);
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
            Notice.set('undefined: ' + text);
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
                target.innerHTML += ' , ';
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
        // Sound.setVolume :: VolumeNumber -> ()
        setVolume: n => {
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
            if(sounds[url] === undefined) {
                console.log(`"${url}" is unregistered`);
                return;
            }
            if(sounds[url].readyState < 2) return;
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
        // Sound.stop :: IDString -> ()
        stop: id => TaskQueue.stopSound(id),
        // Sound.stopAll :: () -> ()
        stopAll: () => TaskQueue.stopAllSound(),
        // Sound.save :: () -> [ExecString]
        save: () => ['volume ' + volume]
    };
})();

const Task = (() => {
    let defaultSound = '0'; // defaultSound :: SoundFlagString
    let defaultImportance = 0; // defaultImportance :: ImportanceFlagNumber

    // importanceStr :: () -> ImportanceFlagString
    const importanceStr = () => ['.', '!', '!!', '!!!'][defaultImportance];
    // importanceToNumber :: ImportanceFlagString -> ImportanceFlagNumber
    const importanceToNumber = str => str === '.' ? 0 : str.length;

    // timer :: (TimerString, DateNumber) -> Maybe DateNumber
    const timer = (s, now) => {
        // regex :: RegExp
        const regex = /^((?:(\d+),)?(\d*?)(\d{1,2})(?:\.(\d+))?)$|^((?:(.*)d)?(?:(.*)h)?(?:(.*)m)?(?:(.*)s)?)$/;
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
        ret.setMilliseconds(0);
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
        setDefault: s => {
            if(s === undefined) {
                Notice.set('default: ' + defaultSound + importanceStr());
                return;
            }
            // result :: Maybe [Maybe String]
            let result = /^([-\d]?)(\.|!{1,3})?$/.exec(s);
            if(result === null) {
                Notice.set(`parse error: default <span class="red">${s}</span>`);
                return;
            }
            if(result[1] !== '') {
                defaultSound = result[1];
            }
            if(result[2] !== undefined) {
                defaultImportance = importanceToNumber(result[2]);
            }
        },
        // Task.parse :: ExecString -> Maybe TaskObject
        parse: s => {
            // regex :: RegExp
            const regex = /^(?:(\d+)#)?([^\/]*)((?:\/(?:([-\d])|([^\/]*?)\*)??(\.|!{1,3})?(?:\/(.*))?)?)$/;
            const result = regex.exec(s); // result :: Maybe [Maybe String]
            const ret = new Object(); // ret :: TaskObject
            const execs = []; // execs :: [ExecString]
            let now; // now :: DateNumber
            if(result === null) return null;
            if(result[1] !== undefined) {
                now = parseInt(result[1], 10);
                ret.saveText = result[1];
            } else {
                now = Date.now();
                ret.saveText = now;
            }
            // plusSplit :: Maybe [Maybe String]
            const plusSplit = /^([^\+]*?)(?:\+(.*))?$/.exec(result[2]);
            ret.deadline = timer(plusSplit[1], now);
            if(ret.deadline === null) {
                ret.deadline = alarm(plusSplit[1], now);
                if(ret.deadline === null) return null;
            }
            ret.isValid = Date.now() - ret.deadline < -UPDATE_TIME / 2;
            ret.saveText += '#' + result[2];
            switch(plusSplit[2]) {
                case undefined:
                    break;
                case '':
                    execs.push(plusSplit[1] + '+' + result[3]);
                    break;
                default:
                    execs.push(plusSplit[2] + result[3]);
                    break;
            }
            ret.saveText += '/';
            if(result[4] !== undefined) {
                execs.push('#sound ' + result[4]);
                ret.saveText += result[4];
            } else if(result[5] !== undefined) {
                execs.push(result[5]);
                ret.saveText += result[5] + '*';
            } else {
                execs.push('#sound ' + defaultSound);
                ret.saveText += defaultSound;
            }
            if(result[6] !== undefined) {
                ret.importance = importanceToNumber(result[6]);
                ret.saveText += result[6];
            } else {
                ret.importance = defaultImportance;
                ret.saveText += importanceStr();
            }
            if(result[7] !== undefined) {
                ret.name = result[7];
                ret.saveText += '/' + result[7];
            } else {
                ret.name = plusSplit[1];
            }
            ret.exec = execs.join(';');
            ret.tipText = (/^\d+#(.*)$/.exec(ret.saveText))[1];
            return ret;
        },
        // Task.sendByGui :: () -> ()
        sendByGui: () => {
            const form = document.gui_form; // form :: Element
            let main; // main :: String
            if(form.task_type.value === 'timer') {
                main = `${form.timer_hour.value}h${form.timer_minute.value}m${form.timer_second.value}s`;
            } else { // form.task_type.value === 'alarm'
                main = [form.alarm_hour.value
                        , form.alarm_minute.value
                        , form.alarm_second.value].join(':');
            }
            parseMain([main, form.sound.value + form.importance.value
                    , form.text.value].join('/'));
        },
        // Task.save :: () -> [ExecString]
        save: () => ['default ' + defaultSound + importanceStr()]
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
                let t = (c[0] & 3) << 4; // t :: UnicodeNumber
                if(isNaN(c[1])) {
                    ret.push(t, 64, 64);
                } else {
                    ret.push(t | (c[1] >> 4))
                    t = (c[1] & 15) << 2;
                    if(isNaN(c[2])) {
                        ret.push(t, 64);
                    } else {
                        ret.push(t | (c[2] >> 6), c[2] & 63);
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
    const makeData = () => [TaskQueue, Button, Display, Sound, Task, Macro]
                .map(x => x.save()).flat().join(SEPARATOR);

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
    const parse = data => data.split(SEPARATOR).forEach(x => parseMain(x));

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
            parseMain('##remove-macro *;remove *;remove-button *;default 0.;\
                    switch alarm;volume 100;empty-trash');
            parse(Base64.decode(text));
            Notice.set('data loaded');
        }
    };
})();

const Button = (() => {
    let buttonCount = 0; // buttonCount :: CountNumber
    const buttons = []; // buttons :: [ButtonObject]

    return {
        // Button.getIdByIndex :: IndexNumber -> Maybe IDNumber
        getIdByIndex: index => {
            return buttons[index] === undefined ? undefined : buttons[index].id;
        },
        // Button.insert :: (ExecString, DateNumber) -> ()
        insert: (str, now = null) => {
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
        // Button.remove :: IDNumber -> ()
        remove: id => {
            if(!removeDom('button_' + id)) return;
            buttons.splice(buttons.findIndex(x => x.id === id), 1);
        },
        // Button.removeAll :: () -> ()
        removeAll: () => buttons.map(x => x.id).forEach(x => Button.remove(x)),
        // Button.moveToTrash :: ParameterString -> ()
        moveToTrash: str => {
            if(str === '*') {
                Trash.push(buttons.map(x => '#' + x.saveText).join(SEPARATOR));
                return;
            }
            Trash.push(str.split(' ')
                          .map(x => buttons.find(y => y.id === parseInt(x, 10)))
                          .filter(x => x !== undefined)
                          .map(x => '#' + x.saveText)
                          .join(SEPARATOR));
        },
        // Button.save :: () -> [ExecString]
        save: () => buttons.map(x => x.saveText)
    };
})();

const Display = (() => {
    let isShowDeadline = true; // isShowDeadline :: Bool
    let isShowMenu = true; // isShowMenu :: Bool

    // dlStr :: (DateNumber, DateNumber) -> DisplayString
    const dlStr = (deadline, now) => '(' + deadlineStr(deadline, now) + ')';
    // restStr :: (DateNumber, DateNumber) -> DisplayString
    const restStr = (deadline, now) => {
        let rest = (deadline - now) / 1000; // rest :: DateNumber
        const d = Math.floor(rest / 86400); // d :: Number
        rest -= d * 86400;
        const h = Math.floor(rest / 3600); // h :: Number
        rest -= h * 3600;
        const m = Math.floor(rest / 60); // m :: Number
        rest -= m * 60;
        const s = Math.floor(rest); // s :: Number
        // ret :: DisplayString
        let ret = [h, m, s].map(x => ('0' + x).slice(-2)).join(':');
        if(d > 0) {
            ret = d + ',' + ret;
        }
        return '[' + ret + ']';
    };

    return {
        // Display.setMode :: ParameterString -> ()
        setMode: str => {
            switch(str) {
                case 'timer':
                    isShowDeadline = false;
                    break;
                case 'alarm':
                    isShowDeadline = true;
                    break;
                default:
                    isShowDeadline = !isShowDeadline;
                    break;
            }
        },
        // Display.show :: () -> ()
        show: () => {
            return TaskQueue.show(isShowDeadline
                    , isShowDeadline ? dlStr : restStr);
        },
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
        save: () => {
            return ['switch ' + (isShowDeadline ? 'alarm' : 'timer'),
                    isShowMenu ? 'show-menu' : 'hide-menu'];
        }
    };
})();

const Macro = (() => {
    const regex = /^([^;]*?)->(.*)$/; // regex :: RegExp
    const macros = []; // macros :: [MacroObject]
    let macroCount = 0; // macroCount :: CountNumber
    let isListShow = false; // isListShow :: Bool

    // formatter :: ExecString -> DisplayString
    const formatter = s => s.replace(regex, '$1 -> $2');

    return {
        // Macro.getIdByIndex :: IndexNumber -> Maybe IDNumber
        getIdByIndex: index => {
            macros[index] === undefined ? undefined : macros[index].id
        },
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
        // Macro.remove :: IDNumber -> ()
        remove: id => {
            if(!removeDom('macro_' + id)) return;
            const i = macros.findIndex(x => x.id === id); // i :: IndexNumber
            if(!isListShow) {
                Notice.set('removed: ' + formatter(macros[i].str));
            }
            macros.splice(i, 1);
        },
        // Macro.removeAll :: () -> ()
        removeAll: () => macros.map(x => x.id).forEach(x => Macro.remove(x)),
        // Macro.moveToTrash :: ParameterString -> ()
        moveToTrash: str => {
            if(str === '*') {
                Trash.push(macros.map(x => x.saveText).join(SEPARATOR));
                return;
            }
            Trash.push(str.split(' ')
                          .map(x => macros.find(y => y.id === parseInt(x, 10)))
                          .filter(x => x !== undefined)
                          .map(x => x.saveText)
                          .join(SEPARATOR));
        },
        // Macro.show :: () -> ()
        show: () => {
            dgebi('macros').className = 'inline-block';
            isListShow = true;
        },
        // Macro.hide :: () -> ()
        hide: () => {
            dgebi('macros').className = 'none';
            isListShow = false;
        },
        // Macro.save :: () -> [ExecString]
        save: () => {
            // ret :: [ExecString]
            const ret = macros.map(x => x.saveText);
            if(isListShow) {
                ret.push('show-macro');
            }
            return ret;
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

    return {
        // TaskQueue.getIdByIndex :: IndexNumber -> Maybe IDString
        getIdByIndex: index => {
            return taskQueue[index] === undefined
                    ? undefined : taskQueue[index].id
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
        // TaskQueue.remove :: IDString -> ()
        remove: id => {
            TaskQueue.stopSound(id);
            if(!removeDom('item_' + id)) return;
            const index = getIndexById(id); // index :: IndexNumber
            if(!taskQueue[index].isValid && taskQueue[index].importance > 1) {
                BackgroundAlert.off();
            }
            taskQueue.splice(index, 1);
        },
        // TaskQueue.removeAlerted :: () -> ()
        removeAlerted: () => {
            const ids = taskQueue.filter(x => !x.isValid)
                                 .map(x => x.id); // ids :: [IDString]
            TaskQueue.moveToTrash(ids.join(' '));
            ids.forEach(x => TaskQueue.remove(x));
        },
        // TaskQueue.removeAll :: () -> ()
        removeAll: () => taskQueue.map(x => x.id)
                                  .forEach(x => TaskQueue.remove(x)),
        // TaskQueue.removeSound :: (IDString, IDNumber) -> ()
        removeSound: (id, soundId) => {
            const index = getIndexById(id); // index :: Maybe IndexNumber
            if(index === undefined) return;
            taskQueue[index].sound.splice(taskQueue[index].sound
                    .findIndex(x => x.soundId === soundId), 1);
        },
        // TaskQueue.checkDeadline :: () -> ()
        checkDeadline: () => {
            for(let i = 0; taskQueue[i] !== undefined
                    && Date.now() - taskQueue[i].deadline >= -UPDATE_TIME / 2
                    ; i++) { // i :: IndexNumber
                if(taskQueue[i].isValid) {
                    taskQueue[i].isValid = false;
                    const id = taskQueue[i].id; // id :: IDString
                    parseMain(taskQueue[i].exec, id);
                    Display.doStrike(id, taskQueue[i].importance);
                }
            }
        },
        // TaskQueue.show :: (Bool, (DateNumber, DateNumber) -> String) -> ()
        show: (isShowDeadline, makeStr) => {
            const now = Date.now(); // now :: DateNumber
            taskQueue.forEach(x => {
                // target :: Element
                const target = dgebi('time_' + x.id);
                if(!x.isValid) {
                    target.innerText = '@' + deadlineStr(x.deadline, now);
                } else {
                    target.innerText = makeStr(x.deadline, now);
                }
            });
        },
        // TaskQueue.stopSound :: IDString -> ()
        stopSound: id => {
            if(!removeDom('stopButton_' + id)) return;
            const index = getIndexById(id); // index :: Maybe IndexNumber
            taskQueue[index].sound.forEach(x => x.pause());
            taskQueue[index].sound = [];
        },
        // TaskQueue.stopAllSound :: () -> ()
        stopAllSound: () => {
            ['global', ...taskQueue.map(x => x.id)]
                    .forEach(x => TaskQueue.stopSound(x))
        },
        // TaskQueue.moveToTrash :: ParameterString -> ()
        moveToTrash: str => {
            if(str === '*') {
                Trash.push(taskQueue.map(x => '#' + x.saveText)
                                    .join(SEPARATOR));
                return;
            }
            Trash.push(str.split(' ')
                          .map(x => taskQueue.find(y => y.id === x))
                          .filter(x => x !== undefined)
                          .map(x => '#' + x.saveText)
                          .join(SEPARATOR));
        },
        // TaskQueue.save :: () -> [ExecString]
        save: () => taskQueue.map(x => x.saveText)
    };
})();

dgebi('cover').addEventListener('click', () => {
    window.addEventListener('click', event => {
        const str = window.getSelection().toString(); // str :: DisplayString
        if(str.length > 0 && str !== '\n') return;
        let target = event.target; // target :: Maybe Element
        while(target !== null) {
            if(target.id === 'menu'
                    || (target.tagName === 'INPUT' && target.type === 'button'))
                return;
            target = target.parentNode;
        }
        document.cui_form.input.focus();
    });
    dgebi('range_volume').addEventListener('input', () =>
            parseMain('#volume ' + dgebi('range_volume').value));
    window.addEventListener('keydown', event => {
        if(event.ctrlKey) {
            switch(event.key) {
                case 'o':
                case 'O':
                    parseMain('#load');
                    event.preventDefault();
                    break;
                case 's':
                case 'S':
                    parseMain('#save');
                    event.preventDefault();
                    break;
                case 'z':
                case 'Z':
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
    dgebi('cover').className = 'none';
    dgebi('body').className = 'of_auto';
    Sound.init();
    window.setInterval(() => {
        dgebi('clock').innerText = toHms(new Date());
        Display.show();
        TaskQueue.checkDeadline();
    }, UPDATE_TIME);
}, {once: true});

Load.exec();
