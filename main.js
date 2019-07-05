'use strict';
const UPDATE_TIME = 200;
const SEPARATOR = '\v';

let toHms = (() => {
    return o => {
        let hms = [o.getHours(), o.getMinutes(), o.getSeconds()];
        return hms.map(x => ('0' + x).slice(-2)).join(':');
    };
})();

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

let removeDom = (() => {
    return id => {
        let target = document.getElementById(id);
        if(target === null) return false;
        target.parentNode.removeChild(target);
        return true;
    };
})();

let Save = (() => {
    return  {
        makeData: sep => {
            let tasks = TaskQueue.save(sep);
            let volume = Sound.save(sep);
            let buttons = Button.save(sep);
            let defaults = Task.save(sep);
            let display = Display.save(sep);
            let macros = Macro.save(sep);
            let rets = [].concat(tasks, volume, buttons, defaults, display
                    , macros);
            return rets.join(sep);
        },
        exec: sep => {
            window.localStorage.setItem('data', Save.makeData(sep));
        }
    };
})();

let Load = (() => {
    return {
        parse: (sep, data) => {
            if(data === null) return;
            data.split(sep).forEach(x => parseMain(x));
        },
        exec: sep => {
            Load.parse(sep, window.localStorage.getItem('data'));
        }
    };
})();

let Notice = (() => {
    let id = undefined;

    return {
        set: html => {
            if(id !== undefined) {
                clearTimeout(id);
            }
            document.getElementById('notice').innerHTML += html;
            id = setTimeout(Notice.clear, 5000);
        },
        clear: () => {
            document.getElementById('notice').innerHTML = '';
            clearTimeout(id);
            id = undefined;
        }
    };
})();

let backgroundAlert = (() => {
    let semaphore = 0;

    return {
        on: () => {
            semaphore++;
            document.getElementById('body').className = 'bg-pink';
        },
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
        setVolume: n => {
            volume = n;
            TaskQueue.setVolume(volume / 100);
            document.getElementById('range_volume').value = volume;
            document.getElementById('volume').innerText = volume;
        },
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
                    + '" type="button" value="stop" onclick="parseMain(\'stop $'
                    + id + '\');">';
        },
        stop: id => {
            TaskQueue.stopSound(id);
        },
        stopAll: () => {
            TaskQueue.stopAllSound();
        },
        save: sep => {
            return 'volume ' + volume;
        }
    };
})();

let Macro = (() => {
    let regex = /^([^;]+?)->(.*)$/, macros = [], macroCount = 0, isHide = true;

    return {
        getIdByIndex: index => {
            return macros[index] === undefined ? undefined : macros[index].id;
        },
        add: s => {
            let result = regex.exec(s), id = macroCount;
            macroCount++;
            let element = {key: new RegExp(result[1], 'gu'), keyStr: result[1]
                    , value: result[2], id: id};
            macros.push(element);
            let newLiElement = document.createElement('li');
            newLiElement.innerHTML =
                    '<input type="button" value="remove" onclick="parseMain(\'remove-macro $'
                    + id + '\');"> ' + element.keyStr + ' -> '
                    + element.value;
            newLiElement.setAttribute('id', 'macro_' + id);
            document.getElementById('macro_parent').appendChild(newLiElement);
        },
        remove: id => {
            if(!removeDom('macro_' + id)) return;
            for(let i = 0; i < macros.length; i++) {
                if(macros[i].id === id) {
                    macros.splice(i, 1);
                    return;
                }
            }
        },
        removeAll: () => {
            macros.map(x => x.id).forEach(x => Macro.remove(x));
        },
        isMatch: s => {
            return regex.test(s);
        },
        replace: s => {
            macros.forEach(x => s = s.replace(x.key, x.value));
            return s;
        },
        show: () => {
            document.getElementById('macro').className = 'block';
            isHide = false;
        },
        hide: () => {
            document.getElementById('macro').className = 'none';
            isHide = true;
        },
        save: sep => {
            let ret = macros.map(x => x.keyStr + '->' + x.value).join(sep);
            if(!isHide) {
                ret = 'show-macro' + sep + ret;
            }
            return ret;
        }
    };
})();

let Button = (() => {
    let buttonCount = 0, buttons = [];

    return {
        getIdByIndex: index => {
            return buttons[index] === undefined ? undefined : buttons[index].id;
        },
        add: str => {
            let element = {id: buttonCount, str: str};
            buttonCount++;
            document.getElementById('button_parent').innerHTML +=
                    '<span id="button_' + element.id
                    + '"><input type="button" value="' + element.str
                    + '" onclick="parseMain(\'' + element.str
                    + '\');"> </span>';
            buttons.push(element);
        },
        remove: id => {
            if(!removeDom('button_' + id)) return;
            for(let i = 0; i < buttons.length; i++) {
                if(buttons[i].id === id) {
                    buttons.splice(i, 1);
                    return;
                }
            }
        },
        removeAll: () => {
            buttons.map(x => x.id).forEach(x => Button.remove(x));
        },
        save: sep => {
            return buttons.map(x => 'button ' + x.str).join(sep);
        }
    };
})();

let TaskQueue = (() => {
    let taskQueue = [], idCount = 0;

    taskQueue[-1] = {id: 'global', sound: [], soundCount: 0};

    let getIndexById = id => {
        for(let i = -1; i < taskQueue.length; i++) {
            if(taskQueue[i].id === id) return i;
        }
        return undefined;
    };

    return {
        getIdByIndex: index => {
            if(taskQueue[index] === undefined) {
                return undefined;
            }
            return taskQueue[index].id;
        },
        setSound: (sound, id) => {
            let index = getIndexById(id), count = taskQueue[index].soundCount;
            sound.soundId = count;
            taskQueue[index].sound.push(sound);
            taskQueue[index].soundCount++;
            return count;
        },
        setVolume: volume => {
            for(let i = -1; i < taskQueue.length; i++) {
                let sound = taskQueue[i].sound;
                if(sound === undefined) continue;
                sound.forEach(x => x.volume = volume);
            }
        },
        isPlay: id => {
            let ret = taskQueue[getIndexById(id)];
            return ret === undefined || ret.sound.length > 0;
        },
        insert: taskElement => {
            let id = idCount, target;
            idCount++;
            let newLiElement = document.createElement('li');
            taskElement.id = id;
            taskElement.sound = [];
            taskElement.soundCount = 0;
            newLiElement.innerHTML =
                    '<input type="button" value="remove" onclick="parseMain(\'remove $'
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
        remove: id => {
            TaskQueue.stopSound(id);
            if(!removeDom('item_' + id)) return;
            let index = getIndexById(id);
            if(taskQueue[index].importance > 1) {
                backgroundAlert.off();
            }
            taskQueue.splice(index, 1);
        },
        removeAll: () => {
            taskQueue.map(x => x.id).forEach(x => TaskQueue.remove(x));
        },
        removeAlerted: () => {
            taskQueue.filter(x => !x.isValid)
                     .map(x => x.id)
                     .forEach(x => TaskQueue.remove(x));
        },
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
        checkDeadline: () => {
            for(let i = 0; taskQueue[i] !== undefined
                    && Date.now() - taskQueue[i].deadline >= -UPDATE_TIME / 2
                    ; i++) {
                if(taskQueue[i].isValid) {
                    taskQueue[i].isValid = false;
                    let id = taskQueue[i].id;
                    Display.doStrike(id, taskQueue[i].importance);
                    parseMain(taskQueue[i].exec, id);
                }
            }
        },
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
        stopSound: id => {
            if(!removeDom('stopButton_' + id)) return;
            let index = getIndexById(id);
            taskQueue[index].sound.forEach(x => x.pause());
            taskQueue[index].sound = [];
        },
        stopAllSound: () => {
            ['global', ...taskQueue.map(x => x.id)]
                    .forEach(x => TaskQueue.stopSound(x));
        },
        save: sep => {
            return taskQueue.map(x => x.saveText).join(sep);
        }
    };
})();

let Task = (() => {
    let defaultSound = '0', defaultImportance = 0;
    let importanceStr = () => {
        return ['.', '!', '!!', '!!!'][defaultImportance];
    };

    let Timer = (() => {
        let regex = /^(?:(\d+),)?(\d*?)(\d{1,2})(?:\.(\d+))?$/;

        return {
            isMatch: s => {
                return regex.test(s);
            },
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
        let isValid = n => n !== '' && n !== undefined;

        return {
            isMatch: s => {
                return regex.test(s);
            },
            parse: (s, now) => {
                let ret = new Date();
                let result = regex.exec(s), isFind = false, isFree = [];
                if(isValid(result[1])) {
                    ret.setFullYear(parseInt(result[1], 10));
                    isFind = true;
                } else {
                    isFree.push(1);
                }
                if(isValid(result[2])) {
                    ret.setMonth(parseInt(result[2], 10) - 1);
                    isFind = true;
                } else if(isFind) {
                    ret.setMonth(0);
                } else {
                    isFree.push(2);
                }
                if(isValid(result[3])) {
                    ret.setDate(parseInt(result[3], 10));
                    isFind = true;
                } else if(isFind) {
                    ret.setDate(1);
                } else {
                    isFree.push(3);
                }
                if(isValid(result[4])) {
                    ret.setHours(parseInt(result[4], 10));
                    isFind = true;
                } else if(isFind) {
                    ret.setHours(0);
                } else {
                    isFree.push(4);
                }
                if(isValid(result[5])) {
                    ret.setMinutes(parseInt(result[5], 10));
                    isFind = true;
                } else if(isFind) {
                    ret.setMinutes(0);
                } else {
                    isFree.push(5);
                }
                if(isValid(result[6])) {
                    ret.setSeconds(parseInt(result[6], 10));
                } else if(isFind) {
                    ret.setSeconds(0);
                } else {
                    isFree.push(6);
                }
                while(now >= ret.getTime() && isFree.length > 0) {
                    let tmp = ret;
                    switch(isFree.pop()) {
                        case 1:
                            tmp.setFullYear(ret.getFullYear() + 1);
                            break;
                        case 2:
                            tmp.setMonth(ret.getMonth() + 1);
                            break;
                        case 3:
                            tmp.setDate(ret.getDate() + 1);
                            break;
                        case 4:
                            tmp.setHours(ret.getHours() + 1);
                            break;
                        case 5:
                            tmp.setMinutes(ret.getMinutes() + 1);
                            break;
                        case 6:
                            tmp.setSeconds(ret.getSeconds() + 1);
                            break;
                    }
                    if(tmp.getTime() > ret.getTime()) {
                        ret = tmp;
                    }
                }
                return ret.getTime();
            }
        };
    })();

    return {
        setDefault: s => {
            if(s === undefined) {
                Notice.set('default: ' + defaultSound + importanceStr());
                return;
            }
            let result = /^([-\d]?)(\.|!{1,3})?$/.exec(s);
            if(result === null) {
                Notice.set('syntax error: default <span class="red">' + s + '</span>');
                return;
            }
            if(result[1] !== '') {
                defaultSound = result[1];
            }
            if(result[2] !== undefined) {
                defaultImportance = result[2] === '.' ? 0 : result[2].length;
            }
        },
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
            plusSplit[1] = Macro.replace(plusSplit[1]);
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
                execs.push('sound ' + result[4]);
                ret.saveText += result[4];
            } else if(result[5] !== undefined) {
                execs.push(result[5]);
                ret.saveText += '*' + result[5];
            } else {
                execs.push('sound ' + defaultSound);
                ret.saveText += defaultSound;
            }
            if(result[6] !== undefined) {
                ret.importance = result[6] === '.' ? 0 : result[6].length;
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
        sendByGui: () => {
            let form = document.guiForm;
            let main = '', taskType = form.taskType.value;
            let sound = form.sound.value, importance = form.importance.value;
            let name = form.text.value;
            if(taskType === 'timer') {
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
        save: sep => {
            return 'default ' + defaultSound + importanceStr();
        }
    };
})();

let getText = (() => {
    return () => {
        let input = document.cuiForm.input.value;
        document.cuiForm.input.value = '';
        parseMain(input);
    };
})();

let parseMain = (() => {
    let idCount = 0, recursionCount = 0;

    let instNumbersParse = (inst, str, obj, method, methodAll) => {
        if(str === '*') {
            methodAll();
            return;
        }
        let noSet = [...new Set(str.split(' '))];
        noSet.map(x => obj.getIdByIndex(parseInt(x, 10) - 1))
                .forEach(x => method(x));
        var notNumbers = noSet.filter(x => !/^\d+$/.test(x));
        if(notNumbers.length > 0) {
            Notice.set('syntax error: ' + inst + ' <span class="red">'
                    + notNumbers.join(' ') + '</span>');
        }
    };
    let isIdCall = (method, str) => {
        let result = /^\$(\d+)$/.exec(str);
        if(result !== null) {
            method(parseInt(result[1], 10));
            return true;
        }
        return false;
    };

    let main = (text, callFrom) => {
        if(Macro.isMatch(text)) {
            Macro.add(text);
            return;
        }
        text = Macro.replace(text);
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
        recursionCount--;
        let spaceSplit = /^([^ ]*)(?: (.*))?$/.exec(text);
        switch(spaceSplit[1]) {
            case 'switch':
                Display.toggle();
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
                if(spaceSplit[2] === undefined || spaceSplit[2] === '') {
                    return;
                }
                Button.add(spaceSplit[2]);
                return;
            case 'remove-button':
                instNumberParse('remove-button', spaceSplit[2], Button
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
                instNumberParse('remove-macro', spaceSplit[2], Macro
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
            default:
                break;
        }
        let taskElement = Task.parse(text);
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
        Save.exec(SEPARATOR);
    };
})();

let Display = (() => {
    let isShowDeadline = true;

    let deadlineStr = (deadline, now) => {
        return '(' + deadlineSubstStr(deadline, now) + ')';
    };
    let restStr = (deadline, now) => {
        return '[' + toDhms((deadline - now) / 1000) + ']';
    };

    return {
        toggle: () => {
            isShowDeadline = !isShowDeadline;
        },
        show: () => {
            TaskQueue.show(isShowDeadline
                    , isShowDeadline ? deadlineStr : restStr);
        },
        doStrike: (id, importance) => {
            let target = document.getElementById('text_' + id);
            target.className = 'strike';
            document.getElementById('time_' + id).innerHTML = '';
            switch(importance) {
                case 3:
                    setTimeout(window.alert, 1000, target.innerText);
                case 2:
                    target.className += ' bg-red';
                    backgroundAlert.on();
                    break;
                case 1:
                    target.className += ' bg-yellow';
                    break;
                case 0:
                    setTimeout(TaskQueue.remove, 15000, id);
                    break;
            }
        },
        save: sep => {
            return !isShowDeadline ? 'switch' : '';
        }
    };
})();

let clock = (() => {
    return () => {
        document.getElementById('clock').innerText = toHms(new Date());
        Display.show();
        TaskQueue.checkDeadline();
    };
})();

let focus = (() => {
    return event => {
        let target = event.target;
        while(target !== null) {
            if(target.id === 'menu') return;
            target = target.parentNode;
        }
        document.cuiForm.input.focus();
    };
})();

let showTimerGUI = (() => {
    return () => {
        document.getElementById('label_radio_timer').className = '';
        document.getElementById('timer_setting').style.display = 'block';
        document.getElementById('label_radio_alarm').className = 'gray';
        document.getElementById('alarm_setting').style.display = 'none';
        document.getElementById('gui_other_setting').style.display = 'block';
    };
})();
let showAlarmGUI = (() => {
    return () => {
        document.getElementById('label_radio_alarm').className = '';
        document.getElementById('alarm_setting').style.display = 'block';
        document.getElementById('label_radio_timer').className = 'gray';
        document.getElementById('timer_setting').style.display = 'none';
        document.getElementById('gui_other_setting').style.display = 'block';
    };
})();

let showVolume = (() => {
    return () => {
        parseMain('volume ' + document.getElementById('range_volume').value);
    };
})();

window.addEventListener('click', focus);
document.getElementById('range_volume').addEventListener('input', showVolume);
Load.exec(SEPARATOR);
setInterval(clock, UPDATE_TIME);
parseMain('init');
