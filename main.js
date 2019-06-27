'use strict';
var NameType = {None: 0, Timer: 1, Alarm: 2};
var UPDATE_TIME = 200;
var SEPARATOR = '|';

var toHms = (() => {
    return o => {
        var hms = [o.getHours(), o.getMinutes(), o.getSeconds()];
        return hms.map(x => ('0' + x).slice(-2)).join(':');
    };
})();

var toDhms = (() => {
    return rest => {
        var d = Math.floor(rest / 86400);
        rest -= d * 86400;
        var h = Math.floor(rest / 3600);
        rest -= h * 3600;
        var m = Math.floor(rest / 60);
        rest -= m * 60;
        var s = Math.floor(rest);
        var ret = [h, m, s].map(x => ('0' + x).slice(-2)).join(':');
        return (d > 0 ? d + ',' : '') + ret;
    }
})();

var removeDom = (() => {
    return id => {
        var target = document.getElementById(id);
        if(target == null) return false;
        target.parentNode.removeChild(target);
        return true;
    };
})();

var Save = (() => {
    return  {
        makeData: sep => {
            var tasks = TaskQueue.save(sep);
            var macros = Replacer.save(sep);
            var volume = Sound.save(sep);
            var buttons = Button.save(sep);
            var defaults = Task.save(sep);
            var display = Display.save(sep);
            var rets = [].concat(tasks, macros, volume, buttons, defaults
                    , display);
            return rets.join(sep);
        },
        exec: sep => {
            var data = Save.makeData(sep);
            window.localStorage.setItem('data', data);
        }
    };
})();

var Load = (() => {
    return {
        parse: (sep, data) => {
            if(data == null) return;
            var items = data.split(sep);
            for(var item of items) {
                parseMain(item, 'global');
            }
        },
        exec: sep => {
            var data = window.localStorage.getItem('data');
            Load.parse(sep, data);
        }
    };
})();

var backgroundAlert = (() => {
    var semaphore = 0;
    return {
        on: () => {
            semaphore++;
            document.getElementById('body').style.backgroundColor = '#ffcabf';
        },
        off: () => {
            semaphore--;
            if(semaphore == 0) {
                document.getElementById('body').style.backgroundColor = 'white';
            }
        }
    };
})();

var Sound = (() => {
    var sounds = [];
    var volume = 100;
    window.addEventListener('click', () => {
        for(var i = 0; i < 10; i++) {
            var url = 'sound/alarm' + i + '.mp3';
            sounds[url] = new Audio(url);
            sounds[url].muted = true;
            sounds[url].onloadeddata = e => {
                sounds[url].play();
            };
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
            if(sounds[url] == undefined) {
                console.log('"' + url + '" is unregistered');
            } else if(sounds[url].readyState == 4) {
                var sound = new Audio();
                sound.src = sounds[url].src;
                sound.volume = volume / 100;
                sound.currentTime = 0;
                sound.play();
                var isPlay = TaskQueue.isPlay(id);
                var soundId = TaskQueue.setSound(sound, id);
                sound.addEventListener('ended', () => {
                    TaskQueue.removeSound(id, soundId);
                    if(TaskQueue.isPlay(id)) return;
                    removeDom('stopButton_' + id);
                }, {once: true});
                if(isPlay) return;
                var target = document.getElementById('item_' + id);
                target.innerHTML += '<input id="stopButton_' + id
                        + '" type="button" value="stop" onclick="Sound.stop(\''
                        + id + '\');">';
            }
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

var Replacer = (() => {
    var regex = /^([^;]+?)->(.*)$/;
    var replaceSet = [];
    var replacerCount = 0;
    var isHide = true;

    return {
        getIdByIndex: index => {
            if(replaceSet[index] == undefined) {
                return undefined;
            }
            return replaceSet[index].id;
        },
        add: s => {
            var result = regex.exec(s);
            var id = replacerCount;
            replacerCount++;
            var element = {key: new RegExp(result[1], 'gu'), keyStr: result[1]
                    , value: result[2], id: id};
            replaceSet.push(element);
            var newLiElement = document.createElement('li');
            newLiElement.innerHTML =
                    '<input type="button" value="remove" onclick="parseMain(\'remove-macro $'
                    + id + '\', \'global\');"> ' + element.keyStr + ' -> '
                    + element.value;
            newLiElement.setAttribute('id', 'macro_' + id);
            var target = document.getElementById('macro_parent');
            target.appendChild(newLiElement);
        },
        remove: id => {
            if(!removeDom('macro_' + id)) return;
            for(var i = 0; i < replaceSet.length; i++) {
                if(replaceSet[i].id == id) {
                    replaceSet.splice(i, 1);
                    return;
                }
            }
        },
        removeAll: () => {
            replaceSet.map(x => x.id).forEach(x => Replacer.remove(x));
        },
        isMatch: s => {
            return regex.test(s);
        },
        replace: s => {
            for(var item of replaceSet) {
                s = s.replace(item.key, item.value);
            }
            return s;
        },
        show: () => {
            document.getElementById('macro').style.display = 'block';
            isHide = false;
        },
        hide: () => {
            document.getElementById('macro').style.display = 'none';
            isHide = true;
        },
        save: sep => {
            var macros = replaceSet.map(x => x.keyStr + '->' + x.value);
            if(isHide) {
                return macros.join(sep);
            } else {
                return ['show-macro', ...macros].join(sep);
            }
        }
    };
})();

var Button = (() => {
    var buttonCount = 0;
    var buttons = [];

    return {
        getIdByIndex: index => {
            return buttons[index].id;
        },
        add: str => {
            var parent = document.getElementById('button_parent');
            var element = {id: buttonCount, str: str};
            buttonCount++;

            parent.innerHTML += '<span id="button_' + element.id
                    + '"><input type="button" value="' + element.str
                    + '" onclick="parseMain(\'' + element.str
                    + '\', \'global\');"> </span>';
            buttons.push(element);
        },
        remove: id => {
            if(!removeDom('button_' + id)) return;
            for(var i = 0; i < buttons.length; i++) {
                if(buttons[i].id == id) {
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

var TaskQueue = (() => {
    var taskQueue = [], idCount = 0;

    taskQueue[-1] = new Object();
    taskQueue[-1].id = 'global';
    taskQueue[-1].sound = [];
    taskQueue[-1].soundCount = 0;

    var getIndexById = id => {
        for(var i = -1; i < taskQueue.length; i++) {
            if(taskQueue[i].id == id) return i;
        }
        return undefined;
    };

    return {
        getIdByIndex: index => {
            if(taskQueue[index] == undefined) {
                return undefined;
            }
            return taskQueue[index].id;
        },
        setSound: (sound, id) => {
            var index = getIndexById(id);
            var count = taskQueue[index].soundCount;
            sound.id = count;
            taskQueue[index].sound.push(sound);
            taskQueue[index].soundCount++;
            return count;
        },
        setVolume: volume => {
            for(var i = -1; i < taskQueue.length; i++) {
                var sound = taskQueue[i].sound;
                if(sound == undefined) continue;
                sound.forEach(x => x.volume = volume);
            }
        },
        isPlay: id => {
            var ret = taskQueue[getIndexById(id)];
            if(ret == undefined) return true;
            return ret.sound.length > 0;
        },
        insert: taskElement => {
            var i, newLiElement = document.createElement('li');
            var id = '' + idCount, target;
            idCount++;
            taskElement.id = id;
            taskElement.sound = [];
            taskElement.soundCount = 0;
            newLiElement.innerHTML =
                    '<input type="button" value="remove" onclick="parseMain(\'remove $'
                    + id + '\', \'global\');"> <span id="text_' + id + '">'
                    + taskElement.name + '<span id ="time_' + id
                    + '"></span></span> ';
            newLiElement.setAttribute('id', 'item_' + id);
            for(i = 0; i < taskQueue.length; i++) {
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
            var index = getIndexById(id);
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
            var index = getIndexById(id);
            if(index == undefined) return;
            for(var i = 0; i < taskQueue[index].sound.length; i++) {
                if(taskQueue[index].sound[i].id == soundId) {
                    taskQueue[index].sound.splice(i, 1);
                    return;
                }
            }
        },
        checkDeadline: () => {
            for(var i = 0; taskQueue[i] != undefined
                    && Date.now() - taskQueue[i].deadline >= -UPDATE_TIME / 2
                    ; i++) {
                if(taskQueue[i].isValid) {
                    var id = taskQueue[i].id;
                    taskQueue[i].isValid = false;
                    parseMain(taskQueue[i].exec, id);
                    Display.doStrike(id, taskQueue[i].importance);
                }
            }
        },
        show: (isShowDeadline, makeStr) => {
            var now = Date.now();
            taskQueue.forEach(x => {
                if(!x.isValid) return;
                var target = document.getElementById('time_' + x.id);
                if(isShowDeadline && x.type == NameType.Alarm) {
                    target.innerText = '';
                } else {
                    target.innerText = makeStr(x.deadline, now);
                }
            });
        },
        stopSound: id => {
            if(!removeDom('stopButton_' + id)) return;
            var index = getIndexById(id);
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

var Task = (() => {
    var defaultSound = '0';
    var defaultImportance = '';

    var formatDeadline = deadline => {
        var o = new Date(deadline);
        var ymd = [o.getFullYear(), o.getMonth() + 1, o.getDate()].join('-');
        return ymd + ',' + toHms(o);
    };

    var Timer = (() => {
        var regex = /^(?:(\d+),)?(\d*?)(\d{1,2})(?:\.(\d+))?$/;
        return {
            isMatch: s => {
                return regex.test(s);
            },
            parse: s => {
                var result = regex.exec(s);
                var ret = 3600 * parseInt('0' + result[2], 10)
                        + 60 * parseInt('0' + result[3], 10);
                if(result[1] != undefined) {
                    ret += 86400 * parseInt(result[1], 10);
                }
                if(result[4] != undefined) {
                    ret += parseInt(result[4], 10);
                }
                return Date.now() + 1000 * ret;
            }
        };
    })();

    var Alarm = (() => {
        var regex = /^(?:(?:(\d*)-)?(\d*)-(\d*),)?(\d*):(\d*)(?::(\d*))?$/;
        var isValid = n => n != '' && n != undefined;
        return {
            isMatch: s => {
                return regex.test(s);
            },
            parse: s => {
                var result = regex.exec(s), ret = new Date(), isFind = false
                        , now = Date.now(), isFree = [];
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
                while(now >= ret.getTime() && isFree.toString() != '') {
                    var pop = isFree.pop(), tmp = ret;
                    switch(pop) {
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
                    if(tmp.getTime() > ret.getTime()) ret = tmp;
                }
                return ret.getTime();
            }
        };
    })();

    return {
        setDefault: s => {
            var result = /^([-\d]?)(!{0,3})$/.exec(s);
            if(result != null) {
                if(result[1] != '') {
                    defaultSound = result[1];
                }
                defaultImportance = result[2];
            }
        },
        parse: s => {
            var regex = /^([^\/]*)((?:\/(?:([-\d])|\*([^\/]*?))?(!{0,3})(?:\/(.*))?)?)$/;
            var result = regex.exec(s);
            var plusSplit = /^([^\+]*?)(?:\+(.*))?$/.exec(result[1]);
            plusSplit[1] = Replacer.replace(plusSplit[1]);
            var ret = new Object(), execs = [];
            if(Timer.isMatch(plusSplit[1])) {
                ret.deadline = Timer.parse(plusSplit[1]);
                ret.type = NameType.Timer;
            } else if(Alarm.isMatch(plusSplit[1])) {
                ret.deadline = Alarm.parse(plusSplit[1]);
                ret.type = NameType.Alarm;
            } else return null;
            ret.isValid = Date.now() - ret.deadline < -UPDATE_TIME / 2;

            ret.saveText = formatDeadline(ret.deadline);
            switch(plusSplit[2]) {
                case undefined:
                    break;
                case '':
                    execs.push(plusSplit[1] + '+' + result[2]);
                    ret.saveText += '+' + plusSplit[1] + '+';
                    break;
                default:
                    execs.push(plusSplit[2] + result[2]);
                    ret.saveText += '+' + plusSplit[2];
                    break;
            }
            ret.saveText += '/';
            if(result[3] != undefined) {
                execs.push('sound ' + result[3]);
                ret.saveText += result[3];
            } else if(result[4] != undefined) {
                execs.push(result[4]);
                ret.saveText += result[4];
            } else {
                execs.push('sound ' + defaultSound);
                ret.saveText += defaultSound;
            }
            if(result[5] != '' && result[5] != undefined) {
                ret.importance = result[5].length;
                ret.saveText += result[5];
            } else {
                ret.importance = defaultImportance.length;
                ret.saveText += defaultImportance;
            }
            ret.saveText += '/';
            if(result[6] != undefined) {
                ret.name = result[6];
                ret.type = NameType.None;
            } else {
                ret.name = plusSplit[1];
            }
            ret.saveText += ret.name;
            ret.exec = execs.join(';');
            return ret;
        },
        sendByGui: () => {
            var form = document.guiForm;
            var taskType = form.taskType.value;
            var sound = form.sound.value;
            var importance = form.importance.value;
            var name = form.text.value;
            var main;
            if(taskType == 'timer') {
                var orig = 3600 * form.timer_hour.value
                        + 60 * form.timer_minute.value
                        + form.timer_second.value;
                main = toDhms(orig).replace(/^(.*):(.*):(.*)$/, '$1$2.$3');
            } else {
                main = [form.alarm_hour.value
                        , form.alarm_minute.value
                        , form.alarm_second.value].join(':');
            }
            parseMain([main, sound + importance, name].join('/'));
        },
        save: sep => {
            return 'default ' + defaultSound + defaultImportance;
        }
    };
})();

var getText = (() => {
    return () => {
        var input = document.cuiForm.input.value;
        document.cuiForm.input.value = '';
        parseMain(input, 'global');
    };
})();

var parseMain = (() => {
    var idCount = 0;

    return (text, callFrom) => {
        if(Replacer.isMatch(text)) {
            Replacer.add(text);
            return;
        }
        text = Replacer.replace(text);
        var texts = text.split(';');
        if(texts.length > 1) {
            texts.forEach(element => parseMain(element, callFrom));
            return;
        }
        var spaceSplit = /^([^ ]*)(?: (.*))?$/.exec(texts), isAccept = true;
        switch(spaceSplit[1]) {
            case 'switch':
                Display.toggle();
                break;
            case 'remove':
                if(spaceSplit[2] == '*') {
                    TaskQueue.removeAll();
                    break;
                } else if(spaceSplit[2] == null) {
                    TaskQueue.removeAlerted();
                    break;
                }
                var idCall = /^\$(\d+)$/.exec(spaceSplit[2]);
                if(idCall != null) {
                    TaskQueue.remove(parseInt(idCall[1]));
                    break;
                }
                [...new Set(spaceSplit[2].split(' '))]
                        .map(x => TaskQueue.getIdByIndex(parseInt(x, 10) - 1))
                        .forEach(x => TaskQueue.remove(x));
                break;
            case 'button':
                if(spaceSplit[2] == null) return;
                Button.add(spaceSplit[2]);
                break;
            case 'remove-button':
                if(spaceSplit[2] == '*') {
                    Button.removeAll();
                    break;
                }
                [...new Set(spaceSplit[2].split(' '))]
                        .map(x => Button.getIdByIndex(parseInt(x, 10) - 1))
                        .forEach(x => Button.remove(x));
                break;
            case 'show-macro':
                Replacer.show();
                break;
            case 'hide-macro':
                Replacer.hide();
                break;
            case 'remove-macro':
                if(spaceSplit[2] == '*') {
                    Replacer.removeAll();
                    break;
                }
                var idCall = /^\$(\d+)$/.exec(spaceSplit[2]);
                if(idCall != null) {
                    Replacer.remove(parseInt(idCall[1]));
                    break;
                }
                [...new Set(spaceSplit[2].split(' '))]
                        .map(x => Replacer.getIdByIndex(parseInt(x, 10) - 1))
                        .forEach(x => Replacer.remove(x));
                break;
            case 'sound':
                if(!/^\d$/.test(spaceSplit[2])) return;
                Sound.play('sound/alarm' + spaceSplit[2] + '.mp3'
                        , callFrom);
                break;
            case 'stop':
                if(spaceSplit[2] == '*') {
                    Sound.stopAll();
                    return;
                } else if(spaceSplit[2] == null) {
                    Sound.stop('global');
                    return;
                }
                [...new Set(spaceSplit[2].split(' '))]
                        .map(x => TaskQueue.getIdByIndex(parseInt(x, 10) - 1))
                        .forEach(x => Sound.stop(x));
                return;
            case 'volume':
                var volume = parseInt(spaceSplit[2], 10);
                if(volume >= 0 && volume <= 100) {
                    Sound.setVolume(volume);
                }
                break;
            case 'default':
                Task.setDefault(spaceSplit[2]);
                break;
            default:
                isAccept = false;
                break;
        }
        if(isAccept) {
            Save.exec(SEPARATOR);
            return;
        }
        var taskElement = Task.parse(texts);
        if(taskElement == null) return;
        TaskQueue.insert(taskElement);
        if(!taskElement.isValid) {
            Display.doStrike(taskElement.id, taskElement.importance);
        }
        Save.exec(SEPARATOR)
    };
})();

var Display = (() => {
    var isShowDeadline = true;

    var deadlineStr = (deadline, now) => {
        var deadlineObj = new Date(deadline);
        var ret = toHms(deadlineObj);
        if(deadline - now >= 86400000) {
            ret = (deadlineObj.getMonth() + 1) + '-' + deadlineObj.getDate()
                    + ',' + ret;
        }
        if(deadline - now >= 86400000 * 365) {
            ret = deadlineObj.getFullYear() + '-' + ret;
        }
        return '(' + ret + ')';
    };
    var restStr = (deadline, now) => {
        var rest = deadline - now;
        return '[' + toDhms(rest / 1000) + ']';
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
            var target = document.getElementById('text_' + id);
            target.className = 'strike';
            document.getElementById('time_' + id).innerHTML = '';
            switch(importance) {
                case 3:
                    setTimeout(window.alert, 1000, target.innerText);
                case 2:
                    target.className += ' red';
                    backgroundAlert.on();
                    break;
                case 1:
                    target.className += ' yellow';
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

var clock = (() => {
    return () => {
        document.getElementById('clock').innerText = toHms(new Date());
        Display.show();
        TaskQueue.checkDeadline();
    };
})();

var focus = (() => {
    return event => {
        var target = event.target;
        while(target != null) {
            if(target.id == 'menu') return;
            target = target.parentNode;
        }
        document.cuiForm.input.focus();
    };
})();

var showTimerGUI = (() => {
    return () => {
        document.getElementById('label_radio_timer').className = '';
        document.getElementById('timer_setting').style.display = 'block';
        document.getElementById('label_radio_alarm').className = 'gray';
        document.getElementById('alarm_setting').style.display = 'none';
        document.getElementById('gui_other_setting').style.display = 'block';
    };
})();
var showAlarmGUI = (() => {
    return () => {
        document.getElementById('label_radio_alarm').className = '';
        document.getElementById('alarm_setting').style.display = 'block';
        document.getElementById('label_radio_timer').className = 'gray';
        document.getElementById('timer_setting').style.display = 'none';
        document.getElementById('gui_other_setting').style.display = 'block';
    };
})();

var showVolume = (() => {
    return () => {
        var value = document.getElementById('range_volume').value;
        parseMain('volume ' + value, 'showVolume');
    };
})();

setInterval(clock, UPDATE_TIME);
parseMain('init', 'global');
