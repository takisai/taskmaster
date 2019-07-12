'use strict';
const UPDATE_TIME = 200;
const SEPARATOR = '\v';

// toHms :: Date -> String
let toHms = (() => {
    return o => {
        let hms = [o.getHours(), o.getMinutes(), o.getSeconds()];
        return hms.map(x => ('0' + x).slice(-2)).join(':');
    };
})();

// toDhms :: DateNumber -> String
let toDhms = (() => {
    return rest => {
        let d = Math.floor(rest / 86400);
        rest -= d * 86400;
        let h = Math.floor(rest / 3600);
        rest -= h * 3600;
        let m = Math.floor(rest / 60);
        rest -= m * 60;
        let s = Math.floor(rest);
        let ret = [h, m, s].map(x => ('0' + x).slice(-2)).join(':');
        if(d > 0) {
            ret = d + ',' + ret;
        }
        return ret;
    }
})();

// deadlineSubstStr :: (DateNumber, DateNumber) -> String
let deadlineSubstStr = (() => {
    return (deadline, now) => {
        let deadlineObj = new Date(deadline);
        let nowObj = new Date(now);
        let ret = '';
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

// removeDom :: IdString -> Bool
let removeDom = (() => {
    return id => {
        let target = document.getElementById(id);
        if(target === null) return false;
        target.parentNode.removeChild(target);
        return true;
    };
})();

let Base64 = (() => {
    let key = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    return {
        // Base64.encode :: String -> Base64String
        encode: str => {
            str = encodeURIComponent(str);
            let ret = '';
            for(let i = 0; i < str.length; i += 3) {
                let c = [0, 1, 2].map(x => str.charCodeAt(i + x)), t;
                ret += key[c[0] >> 2];
                t = (c[0] & 3) << 4;
                if(isNaN(c[1])) {
                    ret += key[t] + '==';
                } else {
                    ret += key[t | (c[1] >> 4)];
                    t = (c[1] & 15) << 2;
                    if(isNaN(c[2])) {
                        ret += key[t] + '=';
                    } else {
                        ret += key[t | (c[2] >> 6)] + key[c[2] & 63];
                    }
                }
            }
            return ret;
        },
        // Base64.decode :: Base64String -> String
        decode: str => {
            let ret = '';
            for(let i = 0; i < str.length; i += 4) {
                let c = [0, 1, 2, 3].map(x => key.indexOf(str.charAt(i + x)));
                let t = [(c[0] << 2) | (c[1] >> 4)];
                if(c[2] >= 0) {
                    t.push(((c[1] & 15) << 4) | (c[2] >> 2));
                    if(c[3] >= 0) {
                        t.push(((c[2] & 3) << 6) | c[3]);
                    }
                }
                ret += t.map(x => String.fromCharCode(x)).join('');
            }
            return decodeURIComponent(ret);
        }
    }
})();

let Save = (() => {
    // makeData :: () -> [ExecString]
    let makeData = () => {
        let tasks = TaskQueue.save();
        let volume = Sound.save();
        let buttons = Button.save();
        let defaults = Task.save();
        let display = Display.save();
        let macros = Macro.save();
        return [].concat(tasks, volume, buttons, defaults, display, macros)
                 .join(SEPARATOR);
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
            let data = window.localStorage.getItem('data');
            if(data === null) return;
            parse(data);
        },
        // Load.fromString :: () -> ()
        fromString: () => {
            let text = prompt('読み込むデータを入れてください:', '');
            if(text === '' || text === null) return;
            parseMain('#remove-macro *;remove *;remove-button *;default 0.;switch alarm;volume 100');
            parse(Base64.decode(text));
            Notice.set('data loaded');
        }
    };
})();

let Notice = (() => {
    let id = undefined;

    return {
        // Notice.set :: HTMLString -> ()
        set: html => {
            let target = document.getElementById('notice');
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
    let semaphore = 0;

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
    let sounds = [];
    let volume = 100;

    window.addEventListener('click', () => {
        for(let i = 0; i < 10; i++) {
            let url = 'sound/alarm' + i + '.mp3';
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
        // Sound.play :: (FileNameString, IdString) -> ()
        play: (url, id) => {
            if(sounds[url] === undefined) {
                console.log('"' + url + '" is unregistered');
                return;
            }
            if(sounds[url].readyState < 2) return;
            let sound = new Audio();
            sound.src = sounds[url].src;
            sound.volume = volume / 100;
            sound.currentTime = 0;
            sound.play();
            let isPlay = TaskQueue.isPlay(id);
            let soundId = TaskQueue.setSound(sound, id);
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
        // Sound.stop :: IdString -> ()
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
    let regex = /^([^;]+?)->(.*)$/, macros = [], macroCount = 0, isHide = true;

    // formatter :: ExecString -> String
    let formatter = s => {
        return s.replace(regex, '$1 -> $2');
    };

    return {
        // Macro.getIdByIndex :: IndexNumber -> Maybe IdNumber
        getIdByIndex: index => {
            return macros[index] === undefined ? undefined : macros[index].id;
        },
        // Macro.add :: ExecString -> ()
        add: s => {
            let result = regex.exec(s), id = macroCount;
            macroCount++;
            let element = {key: new RegExp(result[1], 'gu'), str: s
                    , value: result[2], id: id};
            macros.push(element);
            let newLiElement = document.createElement('li');
            newLiElement.innerHTML =
                    '<input type="button" value="remove" onclick="parseMain(\'#remove-macro $'
                    + id + '\');"> ' + formatter(element.str);
            newLiElement.setAttribute('id', 'macro_' + id);
            document.getElementById('macro_parent').appendChild(newLiElement);
            if(!isHide) return;
            Notice.set('macro: ' + formatter(element.str));
        },
        // Macro.remove :: IdString -> ()
        remove: id => {
            if(!removeDom('macro_' + id)) return;
            for(let i = 0; i < macros.length; i++) {
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
        // Macro.isMatch :: ExecString -> Bool
        isMatch: s => {
            return regex.test(s);
        },
        // Macro.replace :: ExecString -> ExecString
        replace: s => {
            macros.forEach(x => s = s.replace(x.key, x.value));
            return s;
        },
        // Macro.show :: () -> ()
        show: () => {
            document.getElementById('macro').className = 'block';
            isHide = false;
        },
        // Macro.hide :: () -> ()
        hide: () => {
            document.getElementById('macro').className = 'none';
            isHide = true;
        },
        // Macro.save :: () -> [ExecString]
        save: () => {
            let ret = macros.map(x => x.str);
            if(!isHide) {
                ret.push('show-macro');
            }
            return ret;
        }
    };
})();

let Button = (() => {
    let buttonCount = 0, buttons = [];

    return {
        // Button.getIdByIndex :: IndexNumber -> Maybe IdNumber
        getIdByIndex: index => {
            return buttons[index] === undefined ? undefined : buttons[index].id;
        },
        // Button.add :: ExecString -> ()
        add: str => {
            let execStr = str.replace(/'/g, '\\\'').replace(/\\/g, '\\\\');
            let element = {id: buttonCount, str: str};
            buttonCount++;
            document.getElementById('button_parent').innerHTML +=
                    '<span id="button_' + element.id
                    + '"><input type="button" value="' + str
                    + '" onclick="parseMain(\'' + execStr
                    + '\');"> </span>';
            buttons.push(element);
        },
        // Button.remove :: IdString -> ()
        remove: id => {
            if(!removeDom('button_' + id)) return;
            for(let i = 0; i < buttons.length; i++) {
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
        // Button.save :: () -> [ExecString]
        save: () => {
            return buttons.map(x => 'button ' + x.str);
        }
    };
})();

let TaskQueue = (() => {
    let taskQueue = [], idCount = 0;

    taskQueue[-1] = {id: 'global', sound: [], soundCount: 0};

    // getIndexById :: IdString -> Maybe IndexNumber
    let getIndexById = id => {
        for(let i = -1; i < taskQueue.length; i++) {
            if(taskQueue[i].id === id) return i;
        }
        return undefined;
    };

    return {
        // TaskQueue.getIdByIndex :: IndexNumber -> Maybe IdNumber
        getIdByIndex: index => {
            return taskQueue[index] === undefined ? undefined
                    : taskQueue[index].id;
        },
        // TaskQueue.setSound :: (Sound, IdString) -> CountNumber
        setSound: (sound, id) => {
            let index = getIndexById(id), count = taskQueue[index].soundCount;
            sound.soundId = count;
            taskQueue[index].sound.push(sound);
            taskQueue[index].soundCount++;
            return count;
        },
        // TaskQueue.setVolume :: VolumeNumber -> ()
        setVolume: volume => {
            for(let i = -1; i < taskQueue.length; i++) {
                let sound = taskQueue[i].sound;
                if(sound === undefined) continue;
                sound.forEach(x => x.volume = volume);
            }
        },
        // TaskQueue.isPlay :: IdString -> Bool
        isPlay: id => {
            let ret = taskQueue[getIndexById(id)];
            return ret === undefined || ret.sound.length > 0;
        },
        // TaskQueue.insert :: TaskObject -> ()
        insert: taskElement => {
            let id = idCount, target;
            idCount++;
            let newLiElement = document.createElement('li');
            taskElement.id = id;
            taskElement.sound = [];
            taskElement.soundCount = 0;
            newLiElement.innerHTML =
                    '<input type="button" value="remove" onclick="parseMain(\'#remove $'
                    + id + '\');"> <span id="text_' + id + '" title="'
                    + taskElement.tipText + '">' + taskElement.name
                    + '</span><span id ="time_' + id + '"></span> ';
            newLiElement.setAttribute('id', 'item_' + id);
            for(let i = 0; i < taskQueue.length; i++) {
                if(taskQueue[i].deadline > taskElement.deadline) {
                    target = document.getElementById('item_' + taskQueue[i].id);
                    target.parentNode.insertBefore(newLiElement, target);
                    taskQueue.splice(i, 0, taskElement);
                    return;
                }
            }
            target = document.getElementById('parent');
            target.appendChild(newLiElement);
            taskQueue.push(taskElement);
        },
        // TaskQueue.remove :: IdNumber -> ()
        remove: id => {
            TaskQueue.stopSound(id);
            if(!removeDom('item_' + id)) return;
            let index = getIndexById(id);
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
        // TaskQueue.removeSound :: (IdString, IdNumber) -> ()
        removeSound: (id, soundId) => {
            let index = getIndexById(id);
            if(index === undefined) return;
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
                    ; i++) {
                if(taskQueue[i].isValid) {
                    taskQueue[i].isValid = false;
                    let id = taskQueue[i].id;
                    parseMain(taskQueue[i].exec, id);
                    Display.doStrike(id, taskQueue[i].importance);
                }
            }
        },
        // TaskQueue.show :: (Bool, (DateNumber, DateNumber) -> String) -> ()
        show: (isShowDeadline, makeStr) => {
            let now = Date.now();
            taskQueue.forEach(x => {
                let target = document.getElementById('time_' + x.id);
                if(!x.isValid) {
                    target.innerText = '@' + deadlineSubstStr(x.deadline, now);
                } else {
                    target.innerText = makeStr(x.deadline, now);
                }
            });
        },
        // TaskQueue.stopSound :: IdNumber -> ()
        stopSound: id => {
            if(!removeDom('stopButton_' + id)) return;
            let index = getIndexById(id);
            taskQueue[index].sound.forEach(x => x.pause());
            taskQueue[index].sound = [];
        },
        // TaskQueue.stopAllSound :: () -> ()
        stopAllSound: () => {
            ['global', ...taskQueue.map(x => x.id)]
                    .forEach(x => TaskQueue.stopSound(x));
        },
        // TaskQueue.save :: () -> [ExecString]
        save: () => {
            return taskQueue.map(x => x.saveText);
        }
    };
})();

let Task = (() => {
    let defaultSound = '0', defaultImportance = 0;
    // importanceStr :: () -> ImportanceString
    let importanceStr = () => {
        return ['.', '!', '!!', '!!!'][defaultImportance];
    };
    // importanceToNumber :: ImportanceString -> ImportanceNumber
    let importanceToNumber = str => {
        return str === '.' ? 0 : str.length;
    };

    let Timer = (() => {
        let regex = /^(?:(\d+),)?(\d*?)(\d{1,2})(?:\.(\d+))?$/;

        return {
            // Timer.isMatch :: TimerString -> Bool
            isMatch: s => {
                return regex.test(s);
            },
            // Timer.parse :: (TimerString, DateNumber) -> DateNumber
            parse: (s, now) => {
                let result = regex.exec(s);
                let ret = 3600 * parseInt('0' + result[2], 10)
                        + 60 * parseInt('0' + result[3], 10);
                if(result[1] !== undefined) {
                    ret += 86400 * parseInt(result[1], 10);
                }
                if(result[4] !== undefined) {
                    ret += parseInt(result[4], 10);
                }
                return now + 1000 * ret;
            }
        };
    })();

    let Alarm = (() => {
        let regex = /^(?:(?:(\d*)-)?(\d*)-(\d*),)?(\d*):(\d*)(?::(\d*))?$/;
        // isValid :: Maybe String -> Bool
        let isValid = n => n !== '' && n !== undefined;

        return {
            // Alarm.isMatch :: AlarmString -> Bool
            isMatch: s => {
                return regex.test(s);
            },
            // Alarm.parse :: (AlarmString, DateNumber) -> DateNumber
            parse: (s, now) => {
                let ret = new Date();
                let result = regex.exec(s), isFind = false, isFree = [];
                let table =
                        [{get: 'getFullYear', set: 'setFullYear', c: 0, r: 0}
                        , {get: 'getMonth', set: 'setMonth', c: -1, r: 0}
                        , {get: 'getDate', set: 'setDate', c: 0, r: 1}
                        , {get: 'getHours', set: 'setHours', c: 0, r: 0}
                        , {get: 'getMinutes', set: 'setMinutes', c: 0, r: 0}
                        , {get: 'getSeconds', set: 'setSeconds', c: 0, r: 0}];
                for(let i = 0; i < 6; i++) {
                    let t = table[i];
                    if(isValid(result[i + 1])) {
                        ret[t.set](parseInt(result[i + 1], 10) + t.c);
                        isFind = true;
                    } else if(isFind) {
                        ret[t.set](t.r);
                    } else {
                        isFree.push(i);
                    }
                }
                while(now >= ret.getTime() && isFree.length > 0) {
                    let tmp = ret, t = table[isFree.pop()];
                    tmp[t.set](ret[t.get]() + 1);
                    if(tmp.getTime() > ret.getTime()) {
                        ret = tmp;
                    }
                }
                return ret.getTime();
            }
        };
    })();

    return {
        // Task.setDefault :: ConfigString -> ()
        setDefault: s => {
            if(s === undefined) {
                Notice.set('default: ' + defaultSound + importanceStr());
                return;
            }
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
        // Task.parse :: ExecString -> TaskObject
        parse: s => {
            let regex = /^(?:(\d+)#)?([^\/]*)((?:\/(?:([-\d])|\*([^\/]*?))??(\.|!{1,3})?(?:\/(.*))?)?)$/;
            let result = regex.exec(s), ret = new Object(), execs = [], now;
            if(result[1] !== undefined) {
                now = new Date(parseInt(result[1], 10)).getTime();
                ret.saveText = result[1];
            } else {
                now = Date.now();
                ret.saveText = now;
            }
            let plusSplit = /^([^\+]*?)(?:\+(.*))?$/.exec(result[2]);
            if(Timer.isMatch(plusSplit[1])) {
                ret.deadline = Timer.parse(plusSplit[1], now);
            } else if(Alarm.isMatch(plusSplit[1])) {
                ret.deadline = Alarm.parse(plusSplit[1], now);
            } else return null;
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
            let form = document.guiForm, main = '';
            let sound = form.sound.value, importance = form.importance.value;
            let name = form.text.value;
            if(form.taskType.value === 'timer') {
                let orig = 3600 * form.timer_hour.value
                        + 60 * form.timer_minute.value
                        + 1 * form.timer_second.value;
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
            parseMain([main, sound + importance, name].join('/'));
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
        let input = document.cuiForm.input.value;
        document.cuiForm.input.value = '';
        parseMain(input);
    };
})();

// parseMain :: (ExecString, FlagString) -> ()
let parseMain = (() => {
    let idCount = 0, recursionCount = 0;

    // instNumbersParse :: (ExecString, ParameterString, Object, IdString -> (), () -> ()) -> ()
    let instNumbersParse = (inst, str, obj, method, methodAll) => {
        if(str === '*') {
            methodAll();
            return;
        }
        let noSet = [...new Set(str.split(' '))];
        noSet.filter(x => /^\d+$/.test(x))
                .map(x => obj.getIdByIndex(parseInt(x, 10) - 1))
                .forEach(x => method(x));
        if(noSet.some(x => /\D/.test(x))) {
            Notice.set('parse error: ' + inst + ' '
                    + noSet.map(x => x.replace(/^(\d*\D.*)$/
                    , '<span class="red">$1</span>')).join(' '));
        }
    };
    // isIdCall :: (IdNumber, InputString) -> Bool
    let isIdCall = (method, str) => {
        let result = /^\$(\d+)$/.exec(str);
        if(result !== null) {
            method(parseInt(result[1], 10));
            return true;
        }
        return false;
    };

    // main :: (ExecString, FlagString) -> ()
    let main = (text, callFrom) => {
        let hashResult = /^#(.*)/.exec(text), isRawMode = false;
        if(hashResult !== null) {
            text = text.slice(1);
            isRawMode = true;
        }
        if(Macro.isMatch(text)) {
            Macro.add(text);
            return;
        }
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
                if(isIdCall(TaskQueue.remove, spaceSplit[2])) return;
                instNumbersParse('remove', spaceSplit[2], TaskQueue
                        , TaskQueue.remove, TaskQueue.removeAll);
                return;
            case 'button':
                if(spaceSplit[2] === undefined || spaceSplit[2] === '') return;
                Button.add(spaceSplit[2]);
                return;
            case 'remove-button':
                instNumbersParse('remove-button', spaceSplit[2], Button
                        , Button.remove, Button.removeAll);
                return;
            case 'show-macro':
                Macro.show();
                return;
            case 'hide-macro':
                Macro.hide();
                return;
            case 'remove-macro':
                if(isIdCall(Macro.remove, spaceSplit[2])) return;
                instNumbersParse('remove-macro', spaceSplit[2], Macro
                        , Macro.remove, Macro.removeAll);
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
                instNumberParse('stop', spaceSplit[2], TaskQueue, Sound.stop
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
        }
        let taskElement = Task.parse(text, isRawMode);
        if(taskElement === null) {
            if(text === '' || text === 'init') return;
            Notice.set('undefined: ' + text);
            return;
        }
        TaskQueue.insert(taskElement);
        if(!taskElement.isValid) {
            Display.doStrike(taskElement.id, taskElement.importance);
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
    let isShowDeadline = true;

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
        // Display.doStrike :: (IdNumber, ImportanceNumber) -> ()
        doStrike: (id, importance) => {
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
    let target = event.target;
    while(target !== null) {
        if(target.id === 'menu') return;
        target = target.parentNode;
    }
    document.cuiForm.input.focus();
});
document.getElementById('range_volume').addEventListener('input', () => {
    parseMain('volume ' + document.getElementById('range_volume').value);
});
window.addEventListener('keydown', e => {
    if(e.ctrlKey) {
        switch(e.keyCode) {
            case 79:
                parseMain('load');
                break;
            case 83:
                parseMain('save');
                break;
        }
    }
});

Load.exec();
setInterval(clock, UPDATE_TIME);
parseMain('init');
