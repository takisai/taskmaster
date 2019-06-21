'use strict';
var NameType = {None: 0, Timer: 1, Alarm: 2};

var toTimeString = (() => {
    return o => {
        var hms = [o.getHours(), o.getMinutes(), o.getSeconds()];
        return hms.map(x => ('0' + x).slice(-2)).join(':');
    };
})();

var removeDom = (() => {
    return id => {
        var target = document.getElementById(id);
        if(target == null) return false;
        target.parentNode.removeChild(target);
        return true;
    };
})();

var Sound = (() => {
    var sounds = [];
    var volume = 1;
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
        volume: n => {
            volume = n / 100;
        },
        play: (url, id) => {
            if(sounds[url] == undefined) {
                console.log('"' + url + '" is unregistered');
            } else if(sounds[url].readyState == 4) {
                var sound = new Audio();
                sound.src = sounds[url].src;
                sound.volume = volume;
                sound.currentTime = 0;
                sound.play();
                var isPlay = TaskQueue.isPlay(id);
                TaskQueue.setSound(sound, id);
                sound.addEventListener('ended', () => {
                    if(TaskQueue.isPlay(id)) return;
                    removeDom('stopButton_' + id);
                }, {once: true});
                if(isPlay) return;
                var target = document.getElementById(id);
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
        }
    };
})();

var Replacer = (() => {
    var regex = /^([^;]+?)->(.*)$/;
    var replaceSet = [];
    return {
        isMatch: s => {
            return regex.test(s);
        },
        push: s => {
            var result = regex.exec(s);
            replaceSet.push({key: new RegExp(result[1], 'gu'), keyStr: result[1]
                    , value: result[2]});
        },
        replace: s => {
            for(var item of replaceSet) {
                s = s.replace(item.key, item.value);
            }
            return s;
        }
    };
})();

var TaskQueue = (() => {
    var taskQueue = [], idCount = 0;

    taskQueue[-1] = new Object();
    taskQueue[-1].id = 'global';
    taskQueue[-1].sound = [];

    var getIndexById = id => {
        for(var i = -1; i < taskQueue.length; i++) {
            if(taskQueue[i].id == id) return i;
        }
        return undefined;
    };

    return {
        getIdByIndex: index => {
            return taskQueue[index].id;
        },
        setSound: (sound, id) => {
            taskQueue[getIndexById(id)].sound.push(sound);
        },
        isPlay: id => {
            return taskQueue[getIndexById(id)].sound.length > 0;
        },
        insert: taskElement => {
            var i, newLiElement = document.createElement('li');
            var id = '' + idCount, target;
            idCount++;
            taskElement.id = id;
            taskElement.isAlerted = false;
            taskElement.sound = [];
            newLiElement.innerHTML =
                    '<input type="button" value="remove" onclick="TaskQueue.remove(\''
                    + id + '\');"> <span id="text_' + id + '">'
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
            if(!removeDom('item_' + id)) return;
            taskQueue.splice(getIndexById(id), 1);
        },
        removeAll: () => {
            taskQueue.map(x => x.id).forEach(x => TaskQueue.remove(x));
        },
        checkDeadline: () => {
            for(var i = 0; taskQueue[i] != undefined
                    && Date.now() - taskQueue[i].deadline >= -250; i++) {
                if(!taskQueue[i].isAlerted) {
                    var id = taskQueue[i].id;
                    taskQueue[i].isAlerted = true;
                    parseMain(taskQueue[i].exec, id);
                    var textDom = document.getElementById('text_' + id);
                    textDom.className = 'strike';
                    document.getElementById('time_' + id).innerHTML = '';
                    switch(taskQueue[i].importance) {
                        case 0:
                            setTimeout(TaskQueue.remove, 15000, id);
                            break;
                        case 1:
                            textDom.className += ' em';
                            break;
                        case 2:
                            textDom.className += ' em';
                            window.alert(textDom.innerText);
                            break;
                    }
                }
            }
        },
        show: (isShowDeadline, makeStr) => {
            var now = Date.now();
            taskQueue.forEach(x => {
                if(x.isAlerted) return;
                var target = document.getElementById('time_' + x.id);
                if(isShowDeadline && x.type == NameType.Alarm) {
                    target.innerText = '';
                } else {
                    target.innerText = makeStr(x.deadline, now);
                }
            });
        },
        stopSound: id => {
            var index = getIndexById(id);
            taskQueue[index].sound.forEach(x => {
                x.pause();
            });
            taskQueue[index].sound = [];
            removeDom('stopButton_' + id);
        },
        stopAllSound: () => {
            ['global', ...taskQueue.map(x => x.id)]
                    .forEach(x => TaskQueue.stopSound(x));
        }
    };
})();

var Task = (() => {
    var defaultSound = '0';
    var defaultImportance = 0;

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
                console.log(new Date(Date.now() + 1000 * ret).toString());
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
                while(now >= ret.getTime() && isFree != []) {
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
                if(now >= ret.getTime()) return undefined;
                console.log(ret.toString());
            return ret.getTime();
            }
        };
    })();

    return {
        setDefault: s => {
            var regex = /^([-\d])(!{0,2})$/
            if(regex.test(s)) {
                var result = regex.exec(s);
                defaultSound = result[1];
                defaultImportance = result[2];
            }
        },
        parse: s => {
            var regex = /^([^\/]*)((?:\/(?:([-\d])(!{0,2})|\*([^\/]*)(!{0,2}))?(?:\/(.*))?)?)$/;
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
            if(ret.deadline == undefined) return null;

            switch(plusSplit[2]) {
                case undefined:
                    break;
                case '':
                    execs.push(plusSplit[1] + result[2]);
                    break;
                default:
                    execs.push(plusSplit[2] + result[2]);
                    break;
            }
            if(result[3] != undefined) {
                execs.push('sound ' + result[3]);
                ret.importance = result[4].length;
            } else if(result[5] != undefined) {
                execs.push(result[5]);
                ret.importance = result[6].length;
            } else {
                execs.push('sound ' + defaultSound);
                ret.importance = defaultImportance;
            }
            if(result[7] != undefined) {
                ret.name = result[7];
                ret.type = NameType.None;
            } else {
                ret.name = plusSplit[1];
            }
            ret.exec = execs.join(';');
            return ret;
        }
    };
})();

var getText = (() => {
    return () => {
        var input = document.form1.input.value;
        document.form1.input.value = '';
        parseMain(input, 'global');
    };
})();

var parseMain = (() => {
    var idCount = 0;

    return (text, callFrom) => {
        if(Replacer.isMatch(text)) {
            Replacer.push(text);
            return;
        }
        text = Replacer.replace(text);
        var texts = text.split(';');
        if(texts.length > 1) {
            texts.forEach(element => parseMain(element, callFrom));
            return;
        }
        var spaceSplit = /^([^ ]*) (.*)$/.exec(texts);
        if(spaceSplit != null) {
            switch(spaceSplit[1]) {
                case 'switch':
                    Display.toggle();
                    return;
                case 'remove':
                    if(spaceSplit[2] == '*') {
                        TaskQueue.removeAll();
                        return;
                    }
                    [...new Set(spaceSplit[2].split(' '))]
                            .map(x => TaskQueue.getIdByIndex(
                                    parseInt(x, 10) - 1))
                            .forEach(x => TaskQueue.remove(x));
                    return;
            //case 'button':
            //    makeButton()
            //case 'remove-macro':
            //case 'exit':
                case 'sound':
                    if(!/\d/.test(spaceSplit[2])) return;
                    Sound.play('sound/alarm' + spaceSplit[2] + '.mp3'
                            , callFrom);
                    return;
                case 'stop':
                    if(spaceSplit[2] == '*') {
                        Sound.stopAll();
                        return;
                    }
                    [...new Set(spaceSplit[2].split(' '))]
                            .map(x => TaskQueue.getIdByIndex(
                                    parseInt(x, 10) - 1))
                            .forEach(x => Sound.stop(x));
                    return;
                case 'volume':
                    var volume = parseInt(spaceSplit[1], 10);
                    if(volume >= 0 && volume <= 100) {
                        Sound.volume(volume);
                    }
                    return;
                case 'default':
                    Task.setDefault(spaceSplit[1]);
                    return;
            }
        }
        var taskElement = Task.parse(texts);
        if(taskElement == null) return;
        TaskQueue.insert(taskElement);
    };
})();

var Display = (() => {
    var isShowDeadline = true;

    var deadlineStr = (deadline, now) => {
        var deadlineObj = new Date(deadline);
        var ret = toTimeString(deadlineObj);
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
        var d = Math.floor(rest / 86400000);
        rest -= d * 86400000;
        var h = Math.floor(rest / 3600000);
        rest -= h * 3600000;
        var m = Math.floor(rest / 60000);
        rest -= m * 60000;
        var s = Math.round(rest / 1000);
        var ret = [h, m, s].map(x => ('0' + x).slice(-2)).join(':');
        return '[' + (d > 0 ? d + ',' : '') + ret + ']';
    };

    return {
        toggle: () => {
            isShowDeadline = !isShowDeadline;
        },
        show: () => {
            TaskQueue.show(isShowDeadline
                    , isShowDeadline ? deadlineStr : restStr);
        }
    };
})();

var clock = (() => {
    return () => {
        document.getElementById('clock').innerText = toTimeString(new Date());
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
        document.form1.input.focus();
    };
})();

var showTimerGUI = (() => {
    return () => {
        document.getElementById('label_radio_timer').className = '';
        document.getElementById('timer_setting').style.display = 'block';
        document.getElementById('label_radio_alarm').className = 'gray';
        document.getElementById('alarm_setting').style.display = 'none';
    };
})();
var showAlarmGUI = (() => {
    return () => {
        document.getElementById('label_radio_alarm').className = '';
        document.getElementById('alarm_setting').style.display = 'block';
        document.getElementById('label_radio_timer').className = 'gray';
        document.getElementById('timer_setting').style.display = 'none';
    };
})();

setInterval(clock, 500);
