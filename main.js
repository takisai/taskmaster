'use strict';
const UPDATE_TIME = 200; // UPDATE_TIME :: DateNumber
const SEPARATOR = '\v'; // SEPARATOR :: String

// toHms :: Date -> DisplayString
let toHms = (() => {
    return o => {
        // hms :: [Number]
        let hms = [o.getHours(), o.getMinutes(), o.getSeconds()];
        return hms.map(x => ('0' + x).slice(-2)).join(':');
    };
})();

// toDhms :: DateNumber -> DisplayString
let toDhms = (() => {
    return rest => {
        let d = Math.floor(rest / 86400); // d :: Number
        rest -= d * 86400;
        let h = Math.floor(rest / 3600); // h :: Number
        rest -= h * 3600;
        let m = Math.floor(rest / 60); // m :: Number
        rest -= m * 60;
        let s = Math.floor(rest); // s :: Number
        // ret :: DisplayString
        let ret = [h, m, s].map(x => ('0' + x).slice(-2)).join(':');
        if(d > 0) {
            ret = d + ',' + ret;
        }
        return ret;
    }
})();

// deadlineSubstStr :: (DateNumber, DateNumber) -> DisplayString
let deadlineSubstStr = (() => {
    return (deadline, now) => {
        // deadlineObj :: Date;  nowObj :: Date;  ret :: DisplayString
        let deadlineObj = new Date(deadline), nowObj = new Date(now), ret = '';
        if(Math.abs(deadline - now) >= 86400000) {
            if(Math.abs(deadline - now) >= 86400000 * 365) {
                ret = deadlineObj.getFullYear() + '-';
            }
            ret += (deadlineObj.getMonth() + 1) + '-' + deadlineObj.getDate()
                    + ',';
        }
        return ret + toHms(deadlineObj);
    };
})();

// removeDom :: IDString -> Bool
let removeDom = (() => {
    return id => {
        let target = document.getElementById(id); // target :: Maybe Element
        if(target === null) return false;
        target.parentNode.removeChild(target);
        return true;
    };
})();

let Base64 = (() => {
    // KEY :: Base64String
    const KEY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

    return {
        // Base64.encode :: SaveString -> Base64String
        encode: str => {
            str = encodeURIComponent(str);
            let ret = []; // ret :: Base64Number
            for(let i = 0; i < str.length; i += 3) { // i :: IndexNumber
                // c :: [Maybe UnicodeNumber];  t :: UnicodeNumber
                let c = [0, 1, 2].map(x => str.charCodeAt(i + x)), t;
                ret.push(c[0] >> 2);
                t = (c[0] & 3) << 4;
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
            let ret = []; // ret :: UnicodeNumber
            for(let i = 0; i < str.length; i += 4) { // i :: IndexNumber
                // c :: [Base64Number]
                let c = [0, 1, 2, 3].map(x => KEY.indexOf(str.charAt(i + x)));
                ret.push((c[0] << 2) | (c[1] >> 4));
                if(c[2] < 64) {
                    ret.push(((c[1] & 15) << 4) | (c[2] >> 2));
                    if(c[3] < 64) {
                        ret.push(((c[2] & 3) << 6) | c[3]);
                    }
                }
            }
            return decodeURIComponent(
                    ret.map(x => String.fromCharCode(x)).join(''));
        }
    }
})();

let Save = (() => {
    // makeData :: () -> SaveString
    let makeData = () => {
        return [TaskQueue, Sound, Button, Task, Display, Macro]
                .map(x => x.save()).flat().join(SEPARATOR);
    };

    return  {
        // Save.exec :: () -> ()
        exec: () => {
            window.localStorage.setItem('data', makeData());
        },
        // Save.toString :: () -> ()
        toString: () => {
            prompt('セーブデータ:', Base64.encode(makeData()));
        }
    };
})();

let Load = (() => {
    // parse :: SaveString -> ()
    let parse = data => {
        data.split(SEPARATOR).forEach(x => parseMain(x));
    };

    return {
        // Load.exec :: () -> ()
        exec: () => {
            // data :: Maybe SaveString
            let data = window.localStorage.getItem('data');
            if(data === null) return;
            parse(data);
        },
        // Load.fromString :: () -> ()
        fromString: () => {
            // text :: Maybe Base64String
            let text = prompt('読み込むデータを入れてください:', '');
            if(text === '' || text === null) return;
            parseMain('#remove-macro *;remove *;remove-button *;default 0.;switch alarm;volume 100;empty-trash');
            parse(Base64.decode(text));
            Notice.set('data loaded');
        }
    };
})();

let Trash = (() => {
    let items = []; // items :: [SaveString]

    return {
        // Trash.push :: SaveString -> ()
        push: item => {
            items.push(item);
        },
        // Trash.pop :: () -> ()
        pop: () => {
            if(items.length === 0) {
                Notice.set('trash is empty');
                return;
            }
            items.pop().split(SEPARATOR).forEach(x => parseMain(x));
        },
        // Trash.reset :: () -> ()
        reset: () => {
            items = [];
        }
    }
})();

let Notice = (() => {
    let id = undefined; // id :: Maybe IDNumber

    return {
        // Notice.set :: DOMString -> ()
        set: html => {
            let target = document.getElementById('notice'); // target :: Element
            if(id !== undefined) {
                clearTimeout(id);
                target.innerHTML += ' , ';
            }
            target.innerHTML += html;
            id = setTimeout(Notice.clear, 5000);
        },
        // Notice.clear :: () -> ()
        clear: () => {
            document.getElementById('notice').innerHTML = '';
            clearTimeout(id);
            id = undefined;
        }
    };
})();

let BackgroundAlert = (() => {
    let semaphore = 0; // semaphore :: CountNumber

    return {
        // BackgroundAlert.on :: () -> ()
        on: () => {
            semaphore++;
            document.getElementById('body').className = 'bg-pink';
        },
        // BackgroundAlert.off :: () -> ()
        off: () => {
            semaphore--;
            if(semaphore > 0) return;
            document.getElementById('body').className = 'bg-white';
        }
    };
})();

let Sound = (() => {
    let sounds = []; // sounds :: Map URLString Audio
    let volume = 100; // volume :: VolumeNumber

    window.addEventListener('click', () => {
        for(let i = 0; i < 10; i++) { // i :: IndexNumber
            let url = 'sound/alarm' + i + '.mp3'; // url :: URLString
            sounds[url] = new Audio(url);
            sounds[url].muted = true;
            sounds[url].onloadeddata = e => sounds[url].play();
        }
    }, {once: true});

    return {
        // Sound.setVolume :: VolumeNumber -> ()
        setVolume: n => {
            volume = n;
            TaskQueue.setVolume(volume / 100);
            document.getElementById('range_volume').value = volume;
            document.getElementById('volume').innerText = volume;
        },
        // Sound.play :: (URLString, IDString) -> ()
        play: (url, id) => {
            if(sounds[url] === undefined) {
                console.log('"' + url + '" is unregistered');
                return;
            }
            if(sounds[url].readyState < 2) return;
            let sound = new Audio(); // sound :: Audio
            sound.src = sounds[url].src;
            sound.volume = volume / 100;
            sound.currentTime = 0;
            sound.play();
            let isPlay = TaskQueue.isPlay(id); // isPlay :: Bool
            let soundId = TaskQueue.setSound(sound, id); // soundId :: IDNumber
            sound.addEventListener('ended', () => {
                TaskQueue.removeSound(id, soundId);
                if(TaskQueue.isPlay(id)) return;
                removeDom('stopButton_' + id);
            }, {once: true});
            if(isPlay) return;
            document.getElementById('item_' + id).innerHTML +=
                    '<input id="stopButton_' + id
                    + '" type="button" value="stop" onclick="parseMain(\'#stop $'
                    + id + '\');">';
        },
        // Sound.stop :: IDString -> ()
        stop: id => {
            TaskQueue.stopSound(id);
        },
        // Sound.stopAll :: () -> ()
        stopAll: () => {
            TaskQueue.stopAllSound();
        },
        // Sound.save :: () -> [ExecString]
        save: () => {
            return ['volume ' + volume];
        }
    };
})();

let Macro = (() => {
    let regex = /^([^;]*?)->(.*)$/; // regex :: RegExp
    let macros = []; // macros :: [MacroObject]
    let macroCount = 0; // macroCount :: CountNumber
    let isHide = true; // isHide :: Bool

    // formatter :: ExecString -> DisplayString
    let formatter = s => {
        return s.replace(regex, '$1 -> $2');
    };

    return {
        // Macro.getIdByIndex :: IndexNumber -> Maybe IDNumber
        getIdByIndex: index => {
            return macros[index] === undefined ? undefined : macros[index].id;
        },
        // Macro.isAddSuccess :: (ExecString, DateNumber) -> Bool
        isAddSuccess: (s, now = null) => {
            let result = regex.exec(s); // result :: Maybe [Maybe String]
            if(result === null || result[1] === '') return false;
            let id = macroCount; // id :: IDNumber
            macroCount++;
            let isNull = now === null; // isNull :: Bool
            if(isNull) now = Date.now();
            // macroItem :: MacroObject
            let macroItem = {key: new RegExp(result[1], 'gu'), str: s
                    , value: result[2], id: id, time: now
                    , saveText: '-> ' + now + '#' + s};
            // newElement :: Element
            let newElement = document.createElement('li');
            let formatStr = formatter(s); // formatStr :: DisplayString
            newElement.innerHTML =
                    '<input type="button" value="remove" onclick="parseMain(\'#remove-macro $'
                    + id + '\');"> ' + formatStr;
            newElement.setAttribute('id', 'macro_' + id);
            // i :: IndexNumber;  target :: Element
            let i = macros.findIndex(x => x.time > macroItem.time), target;
            if(i >= 0) {
                target = document.getElementById('macro_' + macros[i].id);
                target.parentNode.insertBefore(newElement, target);
                macros.splice(i, 0, macroItem);
            } else {
                target = document.getElementById('macro_parent');
                target.appendChild(newElement);
                macros.push(macroItem);
            }
            if(isHide && isNull) {
                Notice.set('macro: ' + formatStr);
            }
            return true;
        },
        // Macro.addByData :: ParameterString -> ()
        addByData: str => {
            // result :: Maybe [Maybe String]
            let result = /^(\d+)#(.+)$/.exec(str);
            Macro.isAddSuccess(result[2], parseInt(result[1], 10));
        },
        // Macro.remove :: IDNumber -> ()
        remove: id => {
            if(!removeDom('macro_' + id)) return;
            for(let i = 0; i < macros.length; i++) { // i :: IndexNumber
                if(macros[i].id === id) {
                    if(isHide) {
                        Notice.set('removed: ' + formatter(macros[i].str));
                    }
                    macros.splice(i, 1);
                    return;
                }
            }
        },
        // Macro.removeAll :: () -> ()
        removeAll: () => {
            macros.map(x => x.id).forEach(x => Macro.remove(x));
        },
        // Macro.moveToTrash :: ParameterString -> ()
        moveToTrash: str => {
            if(str === '*') {
                Trash.push(macros.map(x => x.saveText).join(SEPARATOR));
                return;
            }
            Trash.push(str.split(' ').map(x => macros.find(y =>
                    y.id === parseInt(x, 10))).filter(x => x !== undefined)
                    .map(x => x.saveText)
                    .join(SEPARATOR));
        },
        // Macro.replace :: ExecString -> ExecString
        replace: s => {
            macros.forEach(x => s = s.replace(x.key, x.value));
            return s;
        },
        // Macro.show :: () -> ()
        show: () => {
            document.getElementById('macros').className = 'block';
            isHide = false;
        },
        // Macro.hide :: () -> ()
        hide: () => {
            document.getElementById('macros').className = 'none';
            isHide = true;
        },
        // Macro.save :: () -> [ExecString]
        save: () => {
            // ret :: [ExecString]
            let ret = macros.map(x => x.saveText);
            if(!isHide) {
                ret.push('show-macro');
            }
            return ret;
        }
    };
})();

let Button = (() => {
    let buttonCount = 0; // buttonCount :: CountNumber
    let buttons = []; // buttons :: [ButtonObject]

    return {
        // Button.getIdByIndex :: IndexNumber -> Maybe IDNumber
        getIdByIndex: index => {
            return buttons[index] === undefined ? undefined : buttons[index].id;
        },
        // Button.add :: (ExecString, DateNumber) -> ()
        add: (str, now = null) => {
            // execStr :: ExecString
            let execStr = str.replace(/'/g, '\\\'').replace(/\\/g, '\\\\');
            if(now === null) now = Date.now();
            // buttonItem :: ButtonObject
            let buttonItem = {id: buttonCount, str: str, time: now
                    , saveText: '$button ' + now + '#' + str};
            buttonCount++;
            // newElement :: Element
            let newElement = document.createElement('span');
            newElement.innerHTML = '<input type="button" value="' + str
                    + '" onclick="parseMain(\'' + execStr + '\');"> ';
            newElement.setAttribute('id', 'button_' + buttonItem.id);
            // i :: IndexNumber; target :: Element
            let i = buttons.findIndex(x => x.time > buttonItem.time), target;
            if(i >= 0) {
                target = document.getElementById('button_' + buttons[i].id);
                target.parentNode.insertBefore(newElement, target);
                buttons.splice(i, 0, buttonItem);
            } else {
                target = document.getElementById('button_parent');
                target.appendChild(newElement);
                buttons.push(buttonItem);
            }
        },
        // Button.addByData :: ParameterString -> ()
        addByData: str => {
            // result :: Maybe [Maybe String]
            let result = /^(\d+)#(.+)$/.exec(str);
            Button.add(result[2], parseInt(result[1], 10));
        },
        // Button.remove :: IDNumber -> ()
        remove: id => {
            if(!removeDom('button_' + id)) return;
            for(let i = 0; i < buttons.length; i++) { // i :: IndexNumber
                if(buttons[i].id === id) {
                    buttons.splice(i, 1);
                    return;
                }
            }
        },
        // Button.removeAll :: () -> ()
        removeAll: () => {
            buttons.map(x => x.id).forEach(x => Button.remove(x));
        },
        // Button.moveToTrash :: ParameterString -> ()
        moveToTrash: str => {
            if(str === '*') {
                Trash.push(buttons.map(x => '#' + x.saveText())
                        .join(SEPARATOR));
                return;
            }
            Trash.push(str.split(' ').map(x => buttons.find(y =>
                    y.id === parseInt(x, 10))).filter(x => x !== undefined)
                    .map(x => '#' + x.saveText)
                    .join(SEPARATOR));
        },
        // Button.save :: () -> [ExecString]
        save: () => {
            return buttons.map(x => x.saveText);
        }
    };
})();

let TaskQueue = (() => {
    let taskQueue = []; // taskQueue :: [TaskObject]
    let idCount = 0; // idCount :: CountNumber

    taskQueue[-1] = {id: 'global', sound: [], soundCount: 0};

    // getIndexById :: IDString -> Maybe IndexNumber
    let getIndexById = id => {
        for(let i = -1; i < taskQueue.length; i++) { // i :: IndexNumber
            if(taskQueue[i].id === id) return i;
        }
        return undefined;
    };

    return {
        // TaskQueue.getIdByIndex :: IndexNumber -> Maybe IDString
        getIdByIndex: index => {
            return taskQueue[index] === undefined ? undefined
                    : taskQueue[index].id;
        },
        // TaskQueue.setSound :: (Sound, IDString) -> IDNumber
        setSound: (sound, id) => {
            let index = getIndexById(id); // index :: Maybe IndexNumber
            let count = taskQueue[index].soundCount; // count :: IDNumber
            sound.soundId = count;
            taskQueue[index].sound.push(sound);
            taskQueue[index].soundCount++;
            return count;
        },
        // TaskQueue.setVolume :: VolumeNumber -> ()
        setVolume: volume => {
            for(let i = -1; i < taskQueue.length; i++) { // i :: IndexNumber
                let sound = taskQueue[i].sound; // sound :: Maybe Sound
                if(sound === undefined) continue;
                sound.forEach(x => x.volume = volume);
            }
        },
        // TaskQueue.isPlay :: IDString -> Bool
        isPlay: id => {
            let ret = taskQueue[getIndexById(id)]; // ret :: Maybe TaskObject
            return ret === undefined || ret.sound.length > 0;
        },
        // TaskQueue.insert :: TaskObject -> ()
        insert: taskItem => {
            let id = idCount, target; // id :: IDNumber;  target :: Element
            idCount++;
            taskItem.id = String(id);
            taskItem.sound = [];
            taskItem.soundCount = 0;
            // newElement :: Element
            let newElement = document.createElement('li');
            newElement.innerHTML =
                    '<input type="button" value="remove" onclick="parseMain(\'#remove $'
                    + id + '\');"> <span id="text_' + id + '" title="'
                    + taskItem.tipText + '">' + taskItem.name
                    + '</span><span id ="time_' + id + '"></span> ';
            newElement.setAttribute('id', 'item_' + id);
            // i :: IndexNumber
            let i = taskQueue.findIndex(x => x.deadline > taskItem.deadline);
            if(i >= 0) {
                target = document.getElementById('item_' + taskQueue[i].id);
                target.parentNode.insertBefore(newElement, target);
                taskQueue.splice(i, 0, taskItem);
            } else {
                target = document.getElementById('parent');
                target.appendChild(newElement);
                taskQueue.push(taskItem);
            }
        },
        // TaskQueue.remove :: IDString -> ()
        remove: id => {
            TaskQueue.stopSound(id);
            if(!removeDom('item_' + id)) return;
            let index = getIndexById(id); // index :: IndexNumber
            if(taskQueue[index].importance > 1) {
                BackgroundAlert.off();
            }
            taskQueue.splice(index, 1);
        },
        // TaskQueue.removeAll :: () -> ()
        removeAll: () => {
            taskQueue.map(x => x.id).forEach(x => TaskQueue.remove(x));
        },
        // TaskQueue.moreveAlerted :: () -> ()
        removeAlerted: () => {
            taskQueue.filter(x => !x.isValid).map(x => x.id)
                     .forEach(x => TaskQueue.remove(x));
        },
        // TaskQueue.removeSound :: (IDString, IDNumber) -> ()
        removeSound: (id, soundId) => {
            let index = getIndexById(id); // index :: Maybe IndexNumber
            if(index === undefined) return;
            // i :: IndexNumber
            for(let i = 0; i < taskQueue[index].sound.length; i++) {
                if(taskQueue[index].sound[i].soundId === soundId) {
                    taskQueue[index].sound.splice(i, 1);
                    return;
                }
            }
        },
        // TaskQueue.checkDeadline :: () -> ()
        checkDeadline: () => {
            for(let i = 0; taskQueue[i] !== undefined
                    && Date.now() - taskQueue[i].deadline >= -UPDATE_TIME / 2
                    ; i++) { // i :: IndexNumber
                if(taskQueue[i].isValid) {
                    taskQueue[i].isValid = false;
                    let id = taskQueue[i].id; // id :: IDString
                    parseMain(taskQueue[i].exec, id);
                    Display.doStrike(id, taskQueue[i].importance);
                }
            }
        },
        // TaskQueue.show :: (Bool, (DateNumber, DateNumber) -> String) -> ()
        show: (isShowDeadline, makeStr) => {
            let now = Date.now(); // now :: DateNumber
            taskQueue.forEach(x => {
                // target :: Element
                let target = document.getElementById('time_' + x.id);
                if(!x.isValid) {
                    target.innerText = '@' + deadlineSubstStr(x.deadline, now);
                } else {
                    target.innerText = makeStr(x.deadline, now);
                }
            });
        },
        // TaskQueue.stopSound :: IDString -> ()
        stopSound: id => {
            if(!removeDom('stopButton_' + id)) return;
            let index = getIndexById(id); // index :: Maybe IndexNumber
            taskQueue[index].sound.forEach(x => x.pause());
            taskQueue[index].sound = [];
        },
        // TaskQueue.stopAllSound :: () -> ()
        stopAllSound: () => {
            ['global', ...taskQueue.map(x => x.id)]
                    .forEach(x => TaskQueue.stopSound(x));
        },
        // TaskQueue.moveToTrash :: ParameterString -> ()
        moveToTrash: str => {
            if(str === '*') {
                Trash.push(taskQueue.map(x => '#' + x.saveText)
                        .join(SEPARATOR));
                return;
            }
            Trash.push(str.split(' ').map(x => taskQueue.find(y => y.id === x))
                    .filter(x => x !== undefined).map(x => '#' + x.saveText)
                    .join(SEPARATOR));
        },
        // TaskQueue.save :: () -> [ExecString]
        save: () => {
            return taskQueue.map(x => x.saveText);
        }
    };
})();

let Task = (() => {
    let defaultSound = '0'; // defaultSound :: SoundFlagString
    let defaultImportance = 0; // defaultImportance :: ImportanceFlagNumber
    // importanceStr :: () -> ImportanceFlagString
    let importanceStr = () => {
        return ['.', '!', '!!', '!!!'][defaultImportance];
    };
    // importanceToNumber :: ImportanceFlagString -> ImportanceFlagNumber
    let importanceToNumber = str => {
        return str === '.' ? 0 : str.length;
    };

    // timer :: (TimerString, DateNumber) -> Maybe DateNumber
    let timer = (() => {
        return (s, now) => {
            // result :: Maybe [Maybe String]
            let result = /^(?:(\d+),)?(\d*?)(\d{1,2})(?:\.(\d+))?$/.exec(s);
            if(result === null) return null;
            // ret :: DateNumber
            let ret = 3600 * parseInt('0' + result[2], 10)
                    + 60 * parseInt('0' + result[3], 10);
            if(result[1] !== undefined) {
                ret += 86400 * parseInt(result[1], 10);
            }
            if(result[4] !== undefined) {
                ret += parseInt(result[4], 10);
            }
            return now + 1000 * ret;
        };
    })();

    // alarm :: (AlarmString, DateNumber) -> Maybe DateNumber
    let alarm = (() => {
        return (s, now) => {
            let result = /^(?:(?:(\d*)-)?(\d*)-(\d*),)?(\d*):(\d*)(?::(\d*))?$/
                    .exec(s); // result :: Maybe [Maybe String]
            if(result === null) return null;
            let ret = new Date(); // ret :: Date
            let isFind = false; // isFind :: Bool
            let isFree = []; // isFree :: [Number]
            // table :: [Object]
            let table =
                    [{get: 'getFullYear', set: 'setFullYear', c: 0, r: 0}
                    , {get: 'getMonth', set: 'setMonth', c: -1, r: 0}
                    , {get: 'getDate', set: 'setDate', c: 0, r: 1}
                    , {get: 'getHours', set: 'setHours', c: 0, r: 0}
                    , {get: 'getMinutes', set: 'setMinutes', c: 0, r: 0}
                    , {get: 'getSeconds', set: 'setSeconds', c: 0, r: 0}];
            for(let i = 0; i < 6; i++) { // i :: IndexNumber
                let t = table[i]; // t :: Object
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
                let tmp = ret; // tmp :: DateNumber
                let t = table[isFree.pop()]; // t :: Object
                tmp[t.set](ret[t.get]() + 1);
                if(tmp.getTime() > ret.getTime()) {
                    ret = tmp;
                }
            }
            return ret.getTime();
        };
    })();

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
                Notice.set('parse error: default <span class="red">' + s
                        + '</span>');
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
            let regex = /^(?:(\d+)#)?([^\/]*)((?:\/(?:([-\d])|\*([^\/]*?))??(\.|!{1,3})?(?:\/(.*))?)?)$/;
            let result = regex.exec(s); // result :: Maybe [Maybe String]
            let ret = new Object(); // ret :: TaskObject
            let execs = [], now; // execs :: [ExecString];  now :: DateNumber
            if(result[1] !== undefined) {
                now = parseInt(result[1], 10);
                ret.saveText = result[1];
            } else {
                now = Date.now();
                ret.saveText = now;
            }
            // plusSplit :: Maybe [Maybe String]
            let plusSplit = /^([^\+]*?)(?:\+(.*))?$/.exec(result[2]);
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
                ret.saveText += '*' + result[5];
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
            let form = document.gui_form; // form :: Element
            let main = ''; // main :: String
            if(form.task_type.value === 'timer') {
                let orig = 3600 * form.timer_hour.value
                        + 60 * form.timer_minute.value
                        + 1 * form.timer_second.value; // orig :: DateNumber
                // result :: Maybe [Maybe String]
                let result
                        = /^(?:(\d+),)?(\d+):(\d+):(\d+)$/.exec(toDhms(orig));
                if(result[1] !== undefined) {
                    main = result[1] + ',';
                }
                main += result[2] + result[3] + '.' + result[4];
            } else {
                main = [form.alarm_hour.value
                        , form.alarm_minute.value
                        , form.alarm_second.value].join(':');
            }
            parseMain([main, form.sound.value + form.importance.value
                    , form.text.value].join('/'));
        },
        // Task.save :: () -> [ExecString]
        save: () => {
            return ['default ' + defaultSound + importanceStr()];
        }
    };
})();

// getText :: () -> ()
let getText = (() => {
    return () => {
        let input = document.cui_form.input.value; // input :: ExecString
        document.cui_form.input.value = '';
        parseMain(input);
    };
})();

// parseMain :: (ExecString, FlagString) -> ()
let parseMain = (() => {
    let idCount = 0; // idCount :: CountNumber
    let recursionCount = 0; // recursionCount :: CountNumber

    // instNumbersParse :: (ExecString, ParameterString, Object, a -> (), () -> (), ParameterString -> ()) -> ()
    let instNumbersParse =
            (inst, str, obj, method, methodAll, toTrash = null) => {
        if(str === '*') {
            if(toTrash !== null) toTrash('*');
            methodAll();
            return;
        }
        let noSet = [...new Set(str.split(' '))]; // noSet :: [String]
        // ids :: [a]
        let ids = noSet.filter(x => /^\d+$/.test(x))
                .map(x => obj.getIdByIndex(parseInt(x, 10) - 1));
        if(toTrash !== null) toTrash(ids.join(' '));
        ids.forEach(x => method(x));
        if(noSet.some(x => /\D/.test(x))) {
            Notice.set('parse error: ' + inst + ' '
                    + noSet.map(x => x.replace(/^(\d*\D.*)$/
                    , '<span class="red">$1</span>')).join(' '));
        }
    };
    // isIdCall :: (IDString -> (), ParameterString, ParameterString -> ()) -> Bool
    let isIdCall = (method, str, toTrash = null) => {
        let result = /^\$(\d+)$/.exec(str); // result :: Maybe [Maybe String]
        if(result === null) return false;
        if(toTrash !== null) toTrash(result[1]);
        method(result[1]);
        return true;
    };

    // main :: (ExecString, FlagString) -> ()
    let main = (text, callFrom) => {
        // hashResult :: Maybe [Maybe String]
        let hashResult = /^(#|->)(.*)$/.exec(text);
        let isRawMode = false; // isRawMode :: Bool
        if(hashResult !== null) {
            text = hashResult[2];
            if(hashResult[1] === '->') {
                text = '->' + text;
            }
            isRawMode = true;
        }
        if(Macro.isAddSuccess(text)) return;
        if(!isRawMode) {
            text = Macro.replace(text);
        }
        let texts = text.split(';');
        if(texts.length > 1) {
            recursionCount++;
            if(recursionCount > 5) {
                throw 'too much recursion';
            }
            texts.forEach(element => main(element, callFrom));
            recursionCount--;
            return;
        }
        // spaceSplit :: Maybe [Maybe String]
        let spaceSplit = /^([^ ]*)(?: (.*))?$/.exec(text);
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
                Button.add(spaceSplit[2]);
                return;
            case '$button':
                Button.addByData(spaceSplit[2]);
                return;
            case 'remove-button':
                instNumbersParse('remove-button', spaceSplit[2], Button
                        , Button.remove, Button.removeAll, Button.moveToTrash);
                return;
            case '->':
                Macro.addByData(spaceSplit[2]);
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
                Sound.play('sound/alarm' + spaceSplit[2] + '.mp3', callFrom);
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
                let volume = parseInt(spaceSplit[2], 10);
                if(volume >= 0 && volume <= 100) {
                    Sound.setVolume(volume);
                }
                return;
            case 'default':
                Task.setDefault(spaceSplit[2]);
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
        }
        // taskItem :: Maybe TaskObject
        let taskItem = Task.parse(text);
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

let Display = (() => {
    let isShowDeadline = true; // isShowDeadline :: Bool

    // deadlineStr :: (DateNumber, DateNumber) -> DisplayString
    let deadlineStr = (deadline, now) => {
        return '(' + deadlineSubstStr(deadline, now) + ')';
    };
    // restStr :: (DateNumber, DateNumber) -> DisplayString
    let restStr = (deadline, now) => {
        return '[' + toDhms((deadline - now) / 1000) + ']';
    };

    return {
        // Display.setMode :: ParameterString -> ()
        setMode: str => {
            switch(str) {
                case '':
                case undefined:
                    isShowDeadline = !isShowDeadline;
                    break;
                case 'timer':
                    isShowDeadline = false;
                    break;
                case 'alarm':
                    isShowDeadline = true;
                    break;
            }
        },
        // Display.show :: () -> ()
        show: () => {
            TaskQueue.show(isShowDeadline
                    , isShowDeadline ? deadlineStr : restStr);
        },
        // Display.doStrike :: (IDString, ImportanceFlagNumber) -> ()
        doStrike: (id, importance) => {
            // target :: Element
            let target = document.getElementById('text_' + id);
            target.className = 'strike';
            switch(importance) {
                case 3:
                    setTimeout(window.alert, 1000, target.innerText);
                case 2:
                    target.className += ' bg-red';
                    BackgroundAlert.on();
                    break;
                case 1:
                    target.className += ' bg-yellow';
                    break;
                case 0:
                    setTimeout(TaskQueue.remove, 15000, id);
                    break;
            }
        },
        // Display.save :: () -> [ExecString]
        save: () => {
            return ['switch ' + (isShowDeadline ? 'alarm' : 'timer')];
        }
    };
})();

// clock :: () -> ()
let clock = (() => {
    return () => {
        document.getElementById('clock').innerText = toHms(new Date());
        Display.show();
        TaskQueue.checkDeadline();
    };
})();

// showTimerGUI :: () -> ()
let showTimerGUI = (() => {
    return () => {
        document.getElementById('label_radio_timer').className = '';
        document.getElementById('timer_setting').className = 'block';
        document.getElementById('label_radio_alarm').className = 'gray';
        document.getElementById('alarm_setting').className = 'none';
        document.getElementById('gui_other_setting').className = 'block';
    };
})();
// showAlarmGUI :: () -> ()
let showAlarmGUI = (() => {
    return () => {
        document.getElementById('label_radio_alarm').className = '';
        document.getElementById('alarm_setting').className = 'block';
        document.getElementById('label_radio_timer').className = 'gray';
        document.getElementById('timer_setting').className = 'none';
        document.getElementById('gui_other_setting').className = 'block';
    };
})();

window.addEventListener('click', event => {
    let target = event.target; // target :: Maybe Element
    while(target !== null) {
        if(target.id === 'menu') return;
        target = target.parentNode;
    }
    document.cui_form.input.focus();
});
document.getElementById('range_volume').addEventListener('input', () => {
    parseMain('volume ' + document.getElementById('range_volume').value);
});
window.addEventListener('keydown', event => {
    if(event.ctrlKey) {
        switch(event.keyCode) {
            case 79:
                parseMain('#load');
                event.preventDefault();
                break;
            case 83:
                parseMain('#save');
                event.preventDefault();
                break;
            case 90:
                parseMain('#undo');
                event.preventDefault();
                break;
        }
    }
});

Load.exec();
setInterval(clock, UPDATE_TIME);
