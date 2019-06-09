var idCount = 0;
var queue = [];

var removeDom = id => {
    var target = document.getElementById(id);
    if(target == null) return null;
    target.parentNode.removeChild(target);
    return true;
};

var playSound = (() => {
    var sounds = [];
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
    return url => {
        if(sounds[url] == undefined) {
            console.log('"' + url + '" is unregistered');
        } else if(sounds[url].readyState == 4) {
            var sound = new Audio();
            sound.src = sounds[url].src;
            sound.currentTime = 0;
            sound.play();
            return sound;
        }
    };
})();
var stopSound = id => {
    for(var i = 0; i < queue.length; i++) {
        if(queue[i].id == id && queue[i].sound != undefined) {
            queue[i].sound.pause();
            removeDom('button_' + id);
            return;
        }
    }
}

var replacer = (() => {
    var regex = /^(.+?)->(.*)$/;
    var replaceSet = [];
    return {
        isMatch: s => {
            return regex.test(s);
        },
        push: s => {
            var result = regex.exec(s);
            var key = new RegExp(result[1], 'gu');
            var index = replaceSet.findIndex(x => x.keyStr == result[1]);
            if(index == -1) {
                replaceSet.push({key: key, keyStr: result[1], value: result[2]});
            } else {
                replaceSet[index].value = result[2];
            }
        },
        replace: s => {
            for(var item of replaceSet) {
                s = s.replace(item.key, item.value);
            }
            return s;
        }
    };
})();

var timer = (() => {
    var regex = /^(?:(\d+),)?(\d*?)(\d{1,2})(?:\.(\d+))?$/;
    return {
        isMatch: s => {
            return regex.test(s);
        },
        parse: s => {
            var result = regex.exec(s);
            var ret = 3600 * parseInt('0' + result[2])
                    + 60 * parseInt('0' + result[3]);
            if(result[1] != undefined) {
                ret += 86400 * parseInt(result[1]);
            }
            if(result[4] != undefined) {
                ret += parseInt(result[4]);
            }
            console.log(new Date(new Date().getTime() + 1000 * ret).toString());
            return new Date().getTime() + 1000 * ret;
        }
    };
})();

var alarm = (() => {
    var regex = /^(?:(?:(\d*)-)??(\d*)-(\d*),)?(\d*):(\d*)(?::(\d*))?$/;
    var isValid = n => n != '' && n != undefined;
    return {
        isMatch: s => {
            return regex.test(s);
        },
        parse: s => {
            var result = regex.exec(s), ret = new Date(), isFind = false
                    , now = new Date().getTime(), isFree = [];
            if(isValid(result[1])) {
                ret.setFullYear(parseInt(result[1]));
                isFind = true;
            } else {
                isFree.push(1);
            }
            if(isValid(result[2])) {
                ret.setMonth(parseInt(result[2]) - 1);
                isFind = true;
            } else if(isFind) {
                ret.setMonth(0);
            } else {
                isFree.push(2);
            }
            if(isValid(result[3])) {
                ret.setDate(parseInt(result[3]));
                isFind = true;
            } else if(isFind) {
                ret.setDate(1);
            } else {
                isFree.push(3);
            }
            if(isValid(result[4])) {
                ret.setHours(parseInt(result[4]));
                isFind = true;
            } else if(isFind) {
                ret.setHours(0);
            } else {
                isFree.push(4);
            }
            if(isValid(result[5])) {
                ret.setMinutes(parseInt(result[5]));
                isFind = true;
            } else if(isFind) {
                ret.setMinutes(0);
            } else {
                isFree.push(5);
            }
            if(isValid(result[6])) {
                ret.setSeconds(parseInt(result[6]));
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

var getText = () => {
    var input = document.form1.input.value;
    document.form1.input.value = '';
    parseText(input);
};

// todo: 複数の命令に置換するときの;の処理等
var parseText = (text) => {
    var num;
    if(replacer.isMatch(text)) {
        replacer.push(text);
        return;
    }
    text = replacer.replace(text);
    if(timer.isMatch(text)) {
        num = timer.parse(text);
    } else if(alarm.isMatch(text)) {
        num = alarm.parse(text);
    } else return;
    if(num == undefined) return;
    var i, newElem = document.createElement('li'), id = '' + idCount;
    idCount++;
    newElem.innerHTML =
            '<input type="button" value="remove" onclick="removeItem(\'' + id
            + '\');"> <span id="text_' + id + '">' + text + '</span>';
    newElem.setAttribute('id', 'item_' + id);
    var e = {value: num, id: id, isAlerted: false, sound: undefined};
    for(i = 0; i < queue.length; i++) {
        if(queue[i].value > num) {
            var target = document.getElementById('item_' + queue[i].id);
            target.parentNode.insertBefore(newElem, target);
            queue.splice(i, 0, e);
            return;
        }
    }
    var target = document.getElementById('parent');
    target.appendChild(newElem);
    queue.push(e);
};
var removeItem = id => {
    if(removeDom('item_' + id) == null) return;
    for(var i = 0; i < queue.length; i++) {
        if(queue[i].id == id) {
            queue.splice(i, 1);
            break;
        }
    }
};
var clock = () => {
    var date = new Date(), elem = document.getElementById('clock');
    var hms = [date.getHours(), date.getMinutes(), date.getSeconds()];
    elem.innerText = hms.map(x => ('0' + x).slice(-2)).join(':');
    for(var i = 0; queue[i] != undefined
            && new Date().getTime() - queue[i].value >= -250; i++) {
        if(!queue[i].isAlerted) {
            queue[i].isAlerted = true;
            queue[i].sound = playSound('sound/alarm0.mp3');
            var target = document.getElementById('item_' + queue[i].id);
            target.innerHTML += ' <input id="button_' + queue[i].id
                    + '" type="button" value="stop" onclick="stopSound(\''
                    + queue[i].id + '\');">';
            document.getElementById('text_' + queue[i].id).className = 'strike';
            var id = queue[i].id;
            setTimeout(removeItem, 15000, id);
        }
    }
};

setInterval(clock, 500);
