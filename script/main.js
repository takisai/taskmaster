/*
Copyright (c) 2019 takisai
Released under the MIT license
https://opensource.org/licenses/mit-license.php
*/
'use strict';
const SUCCESS = true;  // SUCCESS :: Bool
const FAILURE = false; // FAILURE :: Bool
const GLOBAL  = 'global';  // GLOBAL  :: String
const PRIVATE = 'private'; // PRIVATE :: String
const MERGE   = 'merge';   // MERGE   :: String
const UPDATE_TIME = 200; // UPDATE_TIME :: DateNumber
const SEPARATOR = '\v'; // SEPARATOR :: String
const NOTICE_CLEAR_TIME = 5000; // NOTICE_CLEAR_TIME :: DateNumber
const AUTO_REMOVE_TIME = 15000; // AUTO_REMOVE_TIME :: DateNumber

let RECURSION_LIMIT = 5; // RECURSION_LIMIT :: NaturalNumber
let EVAL_TIMEOUT = 100; // EVAL_TIMEOUT :: NaturalNumber

const NUMBER_OF_SOUNDS = 15; // NUMBER_OF_SOUNDS :: NaturalNumber
// NUMBER_OF_SOUNDSの数だけmp3ファイルを登録して音を鳴らすことができます。
// このファイルと同じフォルダーにあるsoundフォルダー内に、
// "alarm<数値>.mp3"という名前のmp3ファイル用意してください。
// <数値>は0からNUMBER_OF_SOUNDS-1までの数値です。

// makeClockStr :: [Number] -> String
const makeClockStr = nums => {
    return nums.map(x => String(Math.floor(x)).padStart(2, '0')).join(':');
};

// toHms :: Date -> String
const toHms = obj => {
    return makeClockStr([obj.getHours(), obj.getMinutes(), obj.getSeconds()]);
}

// removeDom :: String -> ()
const removeDom = id => {
    const target = dgebi(id); // target :: Maybe Element
    if(target === null) return;
    offsetManage(() => target.parentNode.removeChild(target));
};

// htmlEscape :: String -> String
const htmlEscape = str => {
    return str.replace(/&/g, '&amp;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#x27;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/`/g, '&#x60;');
};

// jshtmlEscape :: String -> String
const jshtmlEscape = str => {
    return str.replace(/\\/g, '\\\\')
              .replace(/"/g, '\\&quot;')
              .replace(/'/g, '\\&#x27;')
              .replace(/`/g, '\\&#x60;');
};

// jsEscape :: String -> String
const jsEscape = str => {
    return str.replace(/\\/g, '\\\\')
              .replace(/"/g, '\\\"')
              .replace(/'/g, '\\\'')
              .replace(/`/g, '\\\`');
};

// getText :: () -> ()
const getText = () => {
    const input = Input.get(); // input :: String
    Input.set('');
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
    const isValid = (adoptCond, strs) => {
        return strs.every(x => adoptCond(x) && Number(x) >= 0);
    };
    // makeMode :: String -> String
    const makeMode = flag => {
        return `${form.gui_sound.value}${flag}${form.gui_importance.value}`
    };

    if(form.task_type.value === 'timer') {
        // value :: [String]
        const value = timeUnit.map(x => form[`timer_${x}`].value);
        if(!isValid(x => !isNaN(Number(x)), value)) {
            error();
            return;
        }
        // main :: String
        const main = ['h', 'm', 's'].map((unit, i) => {
            return `${Number(value[i])}${unit}`;
        }).join('');
        ret.push(main, makeMode('t'));
    } else { // form.task_type.value === 'alarm'
        // value :: [String]
        const value = timeUnit.map(x => form[`alarm_${x}`].value);
        if(!isValid(x => /^\d*$/.test(x), value)) {
            error();
            return;
        }
        // main :: String
        const main = value.map(x => parseInt10(x)).join(':');
        ret.push(main, makeMode('a'));
    }
    const name = form.gui_text.value; // name :: String
    if(name !== '') {
        if(/;|->/.test(name)) {
            error();
            return;
        }
        ret.push(name);
    }
    parseMain(ret.join('/'));
};

// safeEval :: (String, String) -> Promise
const safeEval = (str, context = {}) => {
    let isTerminate = false; // isTerminate :: Bool

    // workerFunc :: () -> ()
    const workerFunc = () => {
        addEventListener('message', e => {
            try {
                // s :: String
                const s = `return (()=>{'use strict';return(${e.data[0]})})();`;
                // o :: Object
                const o = e.data[1] ?? {};

                [
                    'AggregateError', 'Array', 'ArrayBuffer', 'Atomics',
                    'BigInt', 'BigInt64Array', 'BigUint64Array', 'Boolean',
                    'DataView', 'Date', 'decodeURI', 'decodeURIComponent',
                    'encodeURI', 'encodeURIComponent', 'Error', 'Float32Array',
                    'Float64Array', 'Infinity', 'Int16Array', 'Int32Array',
                    'Int8Array', 'Intl', 'isFinite', 'isNaN', 'JSON',
                    'Map', 'Math', 'NaN', 'Number', 'Object', 'parseFloat',
                    'parseInt', 'Promise', 'Proxy', 'RangeError',
                    'ReferenceError', 'Reflect', 'RegExp', 'Set', 'String',
                    'Symbol', 'SyntaxError', 'TypeError', 'Uint16Array',
                    'Uint32Array', 'Uint8Array', 'Uint8ClampedArray',
                    'undefined', 'URIError', 'WeakMap', 'WeakRef', 'WeakSet'
                ].forEach(x => o[x] = eval(x));
                if(Object.keys(e.data[1]).length > 0) {
                    // findMaker :: Maybe ([Object] -> Object) ->
                    //     ([Object], Object, Maybe Object) -> String
                    const findMaker = selector => (o, s, t) => {
                        if(s === undefined || s === null) return '';
                        // testEq :: (String, Object) -> Bool
                        const testEq = (x, t) => t?.test?.(x) ?? x === t;
                        // isThru :: Bool
                        const isThru = selector === undefined;
                        switch(o) {
                            case e.data[1]?.task   ?? []:
                                // tmp1 :: [Object]
                                const tmp1 = o.filter(x => {
                                    const t1 = testEq(x.name, s); // t1 :: Bool
                                    const t2 = testEq(x.tag,  t); // t2 :: Bool
                                    return t1 && (t === undefined || t2);
                                });
                                if(isThru) {
                                    return tmp1.map(x => x.index);
                                } else {
                                    return selector(tmp1)?.index ?? '';
                                }
                            case e.data[1]?.button ?? []:
                            case e.data[1]?.macro  ?? []:
                            case e.data[1]?.tag    ?? []:
                                // tmp2 :: [[Object]]
                                const tmp2 = o.map((x,i) => [x,i])
                                              .filter(x => testEq(x[0], s));
                                if(isThru) {
                                    return tmp2.map(x => x[1]);
                                } else {
                                    return selector(tmp2)?.[1] ?? '';
                                }
                            default:
                                return '';
                        }
                    };
                    // toString :: () => String
                    const toString = () => '';
                    o.find   = findMaker(arr => arr[0]);
                    o.rfind  = findMaker(arr => arr.splice(-1)[0]);
                    o.filter = findMaker();
                    Object.setPrototypeOf(o.find,   toString);
                    Object.setPrototypeOf(o.rfind,  toString);
                    Object.setPrototypeOf(o.filter, toString);
                }
                Object.freeze(o);

                // p :: Proxy
                const p = new Proxy(o, {
                    has: (target, key) => true,
                    get: (target, key) => {
                        if(key === Symbol.unscopables) {
                            return undefined;
                        } else {
                            return target[key];
                        }
                    }
                });
                postMessage(Function('p', `with(p){${s}}`).bind(o)(p));
            } catch(e) {
                console.log(e);
                postMessage('');
            }
        });
    };
    // blobURL :: DOMString
    const blobURL = URL.createObjectURL(new Blob(
        [`(${workerFunc.toString()})()`], {type: 'application/javascript'}
    ));
    const worker = new Worker(blobURL); // worker :: Worker
    URL.revokeObjectURL(blobURL);

    return new Promise(resolve => {
        worker.onmessage = e => {
            worker.terminate();
            isTerminate = true;
            resolve(e.data);
        };
        worker.onerror = e => {
            worker.terminate();
            isTerminate = true;
            console.log(`error: eval('${str}')\n${e.message}`);
            resolve('');
        };
        worker.postMessage([str, context]);
        setTimeout(() => {
            if(isTerminate) return;
            worker.terminate();
            console.log(`timeout: eval('${str}')`);
            resolve('');
        }, EVAL_TIMEOUT);
    });
};

// priorityQueue :: ((ManageObject, [Object]) -> ()) -> [Object] -> ()
const priorityQueue = f => {
    let queueCount = 0;   // queueCount :: NaturalNumber
    const item = [];      // item :: [QueueObject]
    const len = f.length; // len :: NaturalNumber

    const READY   = 0; // READY :: NaturalNumber
    const RUNNING = 1; // RUNNING :: NaturalNumber
    const SUSPEND = 2; // SUSPEND :: NaturalNumber

    // push :: ([NaturalNumber], [Object], NaturalNumber) -> ()
    const push = (id, args, state) => {
        // target :: QueueObject
        const target = {id: id, args: args, state: state};
        // lessEqThan :: ([NaturalNumber], [NaturalNumber]) -> Bool
        const lessEqThan = (x, y) => {
            let i = 0; // i :: NaturalNumber
            for(; x[i] !== undefined && y[i] !== undefined; ++i) {
                if(x[i] !== y[i]) return x[i] < y[i];
            }
            return (x[i] ?? -1) <= (y[i] ?? -1);
        };
        // index :: NaturalNumber
        const index = item.findIndex(x => lessEqThan(id, x.id));
        if(index < 0) {
            item.push(target);
        } else {
            if(lessEqThan(item[index].id, id)) {
                item[index] = target;
            } else {
                item.splice(index, 0, target);
            }
        }
    };

    return (...args) => {
        // id :: [NaturalNumber]
        const id = (() => {
            if(args.length >= len) {
                return args.shift();
            } else {
                const tmp = [queueCount]; // tmp :: [NaturalNumber]
                ++queueCount;
                return tmp;
            }
        })();
        push(id, args, READY);
        while(item.length > 0 && item[0].state === READY) {
            // top :: QueueObject
            const top = item[0];
            // manager :: QueueManager
            const manager = {
                id: top.id,
                suspension: () => top.state = SUSPEND,
                makeTask: n => {
                    // ret :: [[NaturalNumber]]
                    const ret = range(n).map(x => [...top.id, x]);
                    ret.forEach(x => push(x, [], READY));
                    return ret;
                }
            };
            top.state = RUNNING;
            f(manager, ...top.args);
            if(top.state === SUSPEND) break;
            item.shift();
        }
        if(item.length === 0) {
            queueCount = 0;
        }
    };
};

// parseMain :: (String, String) -> ()
const parseMain = (() => {
    let idCount = 0; // idCount :: NaturalNumber
    let isHelpCall = false; // isHelpCall :: Bool

    // evaluate :: String -> Promise
    const evaluate = async str => {
        // obj :: Object
        const obj = Object.assign(
            TaskQueue.getEvalObject(),
            Tag.getEvalObject(),
            Macro.getEvalObject(),
            Button.getEvalObject()
        );
        const ret = ['#']; // ret :: [String]
        while(str !== '') {
            // result :: Maybe Object
            const result = /^(.*?)(\$\{(.*?)\$\}(.*))?$/.exec(str);
            ret.push(result[1]);
            if(result[2] === undefined) break;
            if(result[3] !== '') {
                // tmp :: Object
                const tmp = await safeEval(result[3], obj);
                ret.push((Array.isArray(tmp) ? tmp : [tmp]).join(' '));
            }
            str = result[4];
        }
        return ret.join('');
    };
    // play :: (String, String) -> ()
    const play = (parameter, callFrom) => {
        if(!/^\d+$/.test(parameter)) {
            if(parameter === '-') return;
            Notice.set(
                'error: ',
                Help.makeLink('sound'), ' ',
                Notice.AttrString.makeError(parameter)
            );
            return;
        }
        Sound.play(`sound/alarm${parameter - 1}.mp3`, callFrom);
    };

    // main :: (QueueManager, String, String) -> ()
    const main = (mng, text, callFrom) => {
        text = text.replace(/\s+/g, ' ');
        const isHeadHash = /^#/.test(text); // isHeadHash :: Bool
        const isHeadArrow = /^->/.test(text); // isHeadArrow :: Bool
        const isRawMode = isHeadHash || isHeadArrow; // isRawMode :: Bool
        if(isHeadHash) {
            text = text.slice(1);
        }
        if(Macro.insert(text) === SUCCESS) return;
        const trimText = /^\s*(.*)( ?)$/.exec(text); // trimText :: String
        text = trimText[1];
        if(!isRawMode) {
            text = Macro.replace(text);
            if(/\$\{.*?\$\}/.test(text)) {
                mng.suspension();
                evaluate(text).then(value => {
                    mainWrapper(mng.id, value, callFrom)
                });
                return;
            }
        }
        if(text === '') return;
        if(Macro.modify(text) === SUCCESS) return;
        if(!isHeadArrow) {
            // texts :: [String]
            const texts = `${text}${trimText[2]}`.split(';');
            if(texts.length > 1) {
                if(mng.id.length > RECURSION_LIMIT) throw 'too much recursion';
                // ids :: [NaturalNumber]
                const ids = mng.makeTask(texts.length);
                texts.forEach((element, i) => {
                    mainWrapper(ids[i], element, callFrom);
                });
                return;
            }
        }
        // spaceSplit :: Maybe Object
        const spaceSplit = /^([^ ]*)(?: (.*))?$/.exec(text);
        // console.assert(spaceSplit !== null);
        // parameter :: String
        const parameter = spaceSplit[2] === undefined ? '' : spaceSplit[2];
        switch(callFrom) {
            case MERGE:
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
                        Button.insertByData(`${parameter}${trimText[2]}`);
                        return;
                    case '->':
                        Macro.insertByData(`${parameter}${trimText[2]}`);
                        return;
                }
                break;
            case PRIVATE:
                switch(spaceSplit[1]) {
                    case '$button':
                        Button.insertByData(`${parameter}${trimText[2]}`);
                        return;
                    case '$tag':
                        Tag.insertByData(parameter);
                        return;
                    case '->':
                        Macro.insertByData(`${parameter}${trimText[2]}`);
                        return;
                    case 'print':
                        Notice.clear();
                        Notice.set(parameter);
                        return;
                }
                // fallthrough
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
                    case 'edit':
                        TaskQueue.edit(parameter);
                        return;
                    case 'modify':
                        TaskQueue.modify(parameter);
                        return;
                    case 'remove':
                        TaskQueue.remove(parameter, callFrom);
                        return;
                    case 'tag':
                        Tag.insert(parameter);
                        return;
                    case 'order-tag':
                        Tag.order(parameter);
                        return;
                    case 'edit-tag':
                        Tag.edit(parameter);
                        return;
                    case 'modify-tag':
                        mng.suspension();
                        mainWrapper(mng.id, Tag.modify(parameter), callFrom);
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
                        Button.insert(`${parameter}${trimText[2]}`);
                        return
                    case 'order-button':
                        Button.order(parameter);
                        return;
                    case 'edit-button':
                        Button.edit(parameter);
                        return;
                    case 'modify-button':
                        Button.modify(parameter);
                        return;
                    case 'remove-button':
                        Button.remove(parameter);
                        return;
                    case 'show-macro':
                        Macro.show();
                        return;
                    case 'hide-macro':
                        Macro.hide();
                        return;
                    case 'order-macro':
                        Macro.order(parameter);
                        return;
                    case 'edit-macro':
                        Macro.edit(parameter);
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
                    case 'input':
                        Input.set(`${parameter}${trimText[2]}`);
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
                        Help.open(parameter);
                        isHelpCall = true;
                        return;
                }
                break;
        }
        // moveResult :: Maybe Object
        const moveResult = /^move(?:#(.*))?$/.exec(spaceSplit[1]);
        if(moveResult !== null) {
            TaskQueue.move(parameter, moveResult[1]);
            return;
        }
        if(TaskQueue.tryInsert(text, callFrom) === SUCCESS) return;
        Notice.set('error: ', Notice.AttrString.makeError(text));
    };

    // [Object] -> ()
    const mainWrapper = priorityQueue((mng, text, callFrom) => {
        try {
            main(mng, text, callFrom);
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
    });

    return (text, callFrom = GLOBAL) => {
        Notice.clear();
        isHelpCall = false;
        mainWrapper(text, callFrom);
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

const Util = (() => {
    // parseOrder :: (String, NaturalNumber) -> Maybe [NaturalNumber]
    const parseOrder = (str, max) => {
        const has = new Array(max).fill(false); // has :: [Bool]
        // parse :: Maybe [[NaturalNumber]]
        const parse = (() => {
            // arr :: [Maybe [NaturalNumber]]
            const arr = str.split(' ').map(x => {
                // nums :: Maybe [NaturalNumber]
                const nums = Util.parseRangeString(x, max);
                // isValid :: NaturalNumber -> Bool
                const isValid = x => {
                    if(has[x]) {
                        return false;
                    } else {
                        has[x] = true;
                        return true;
                    }
                };
                return nums?.every(x => isValid(x)) ? nums : null;
            });
            return arr.some(x => x === null) ? null : arr;
        })();
        if(parse === null) return null;
        const ret = []; // ret :: [NaturalNumber]
        // objIt :: NaturalNumber
        // parseIt :: NaturalNumber
        for(let objIt = 0, parseIt = 0; objIt < max; ) {
            if(!has[objIt]) {
                ret.push(objIt);
                ++objIt;
                continue;
            }
            ret.push(...parse[parseIt]);
            ++parseIt;
            objIt += parse.find(x => x.includes(objIt)).length;
        }
        return ret;
    };

    return {
        // Util.insert :: (
        //     [Object],
        //     Object,
        //     Element,
        //     String,
        //     Maybe NaturalNumber,
        //     Maybe NaturalNumber
        // ) -> ()
        insert: (object, item, element, name, index, insertIndex) => {
            element.setAttribute('id', `${name}_${item.id}`);
            // i :: NaturalNumber
            const i = insertIndex === undefined
                    ? object.findIndex(x => x.time > item.time) : insertIndex;
            if(i >= 0) {
                // target :: Maybe Element
                const target = dgebi(`${name}_${object[i].id}`);
                // console.assert(target !== null);
                offsetManage(() => {
                    target.parentNode.insertBefore(element, target);
                });
                object.splice(i, 0, item);
            } else {
                // branch :: String
                const branch = index === undefined ? '' : `_${index}`;
                offsetManage(() => {
                    dgebi(`${name}_parent${branch}`).appendChild(element);
                });
                object.push(item);
            }
        },
        // Util.insertByData ::
        //     (String, (String, Maybe DateNumber) -> Object) -> ()
        insertByData: (str, func) => {
            // result :: Maybe Object
            const result = /^(\d+)#(.*)$/.exec(str);
            // console.assert(result !== null || result[2] !== undefined);
            func(result[2], parseInt10(result[1]));
        },
        // Util.order :: (String, [Object], String) -> ()
        order: (str, obj, name) => {
            // len :: NaturalNumber
            const len = obj.length;
            // perm :: Maybe [NaturalNumber]
            const perm = parseOrder(str, len);
            if(perm === null) {
                Notice.set(
                    'error: ',
                    Help.makeLink(`order-${name}`), ' ',
                    Notice.AttrString.makeError(str)
                );
                return;
            }
            // elements :: Maybe [Element]
            const elements = dgebi(`${name}_parent`)?.children;
            if(elements?.length !== len) {
                throw 'The size of HTML elements and arrays are different.';
            }
            // htmls :: [String]
            const htmls = range(len).map(i => elements[i].outerHTML);
            // times :: [DateNumber]
            const times = obj.map(x => x.time);
            range(len).forEach(i => {
                elements[i].outerHTML = htmls[perm[i]];
                obj[perm[i]].sortNum = i;
            });
            obj.sort((x, y) => x.sortNum - y.sortNum);
            obj.forEach((x, i) => {
                x.time = times[i];
                delete x.sortNum;
            });
        },
        // Util.edit :: (Object, String, String) -> ()
        edit: (obj, name, str) => {
            // target :: Maybe Object
            const target = obj.getEvalObject()[name][str];
            if(target === undefined) {
                Notice.set(
                    'error: ',
                    Help.makeLink(`edit-${name}`), ' ',
                    Notice.AttrString.makeError(str)
                );
                return;
            }
            Input.set(`#modify-${name} ${str} ${target}`);
        },
        // Util.parseRangeString :: (String, NaturalNumber)
        //     -> Maybe [NaturalNumber]
        parseRangeString: (str, max) => {
            if(str === '*') return range(max);
            if(/^\d+$/.test(str)) {
                const num = parseInt10(str); // num :: NaturalNumber
                return (num < 1 || num > max) ? null : [num - 1];
            }
            // rangeParse :: Maybe Object
            const rangeParse = /^(\d*)-(\d*)$/.exec(str);
            if(str === '-' || rangeParse === null) return null;

            // first :: Maybe NaturalNumber
            const first = (() => {
                if(rangeParse[1] === '') return 1;
                const ret = parseInt10(rangeParse[1]); // ret :: NaturalNumber
                return ret > max ? null : Math.max(ret, 1);
            })();
            // last :: Maybe NaturalNumber
            const last = (() => {
                if(rangeParse[2] === '') return max;
                const ret = parseInt10(rangeParse[2]); // ret :: NaturalNumber
                return ret < 1 ? null : Math.min(ret, max);
            })();
            if(first === null || last === null) return null;
            // make :: (NaturalNumber, NaturalNumber) -> [NaturalNumber]
            const make = (x, y) => range(x, y + 1).map(t => t - 1);
            if(first <= last) {
                return make(first, last);
            } else {
                return make(last, first).reverse();
            }
        },
        // Util.parameterCheck :: (String, NaturalNumber) -> IndexObject
        parameterCheck: (str, max) => {
            // ret :: [Object]
            const ret = str.split(' ').map(x => {
                // parseResult :: Maybe [NaturalNumber]
                const parseResult = Util.parseRangeString(x, max);
                if(parseResult === null) {
                    return {isErr: true, str: Notice.AttrString.makeError(x)};
                } else {
                    return {data: parseResult, isErr: false, str: x};
                }
            });
            // nubData :: [Maybe NaturalNumber]
            const nubData = unique(ret.map(x => x.data).flat());
            return {
                data: nubData.filter(x => x !== undefined),
                isErr: ret.some(x => x.isErr),
                str: Notice.AttrString.join(ret.map(x => x.str))
            };
        },
        // Util.updateIndex ::
        //     (String, [NaturalNumber], Element -> Element) -> ()
        updateIndex: (str, ids, treat = x => x) => {
            ids.forEach((id, i) => treat(dgebi(str + id)).title = i + 1);
        },
        // Util.getEvalObject :: (Object, String, String -> String) -> Object
        getEvalObject: (obj, name, treat = x => x) => {
            // arr :: [Maybe String]
            const arr = [undefined, ...obj.map(x => treat(x.str))];
            return {[name]: Object.freeze(arr)};
        }
    };
})();

const BackgroundAlert = (() => {
    let semaphore = 0; // semaphore :: NaturalNumber

    return {
        // BackgroundAlert.up :: () -> ()
        up: () => {
            ++semaphore;
            dgebi('body').className = 'background-color_pink';
        },
        // BackgroundAlert.down :: () -> ()
        down: () => {
            if(semaphore > 0) {
                --semaphore;
                if(semaphore > 0) return;
            }
            dgebi('body').className = 'background-color_white';
        }
    };
})();

const Help = (() => {
    const LIST = {
        'switch':        'switch',
        'switch-alarm':  'switch',
        'switch-timer':  'switch',
        'edit':          'edit',
        'modify':        'modify',
        'remove':        'task_remove',
        'tag':           'add_tag',
        'order-tag':     'order',
        'edit-tag':      'edit',
        'modify-tag':    'modify',
        'remove-tag':    'remove_tag',
        'open-tag':      'open_tag',
        'close-tag':     'open_tag',
        'toggle-tag':    'open_tag',
        'button':        'create_button',
        'order-button':  'order',
        'edit-button':   'edit',
        'modify-button': 'modify',
        'remove-button': 'remove_button',
        'show-macro':    'show_macro',
        'hide-macro':    'show_macro',
        'order-macro':   'order',
        'edit-macro':    'edit',
        'modify-macro':  'modify',
        'remove-macro':  'remove_macro',
        'sound':         'sound',
        'stop':          'stop_sound',
        'volume':        'volume',
        'mute-on':       'mute',
        'mute-off':      'mute',
        'mute':          'mute',
        'default':       'default',
        'show-menu':     'menu',
        'hide-menu':     'menu',
        'input':         'input',
        'save':          'save',
        'load':          'load',
        'merge':         'merge',
        'undo':          'undo',
        'empty-trash':   'empty_trash',
        'empty-history': 'empty_history',
        'move':          'move_task',
        'help':          'help',
        'find':          'find',
        'rfind':         'find',
        'filter':        'find'
    };

    // at :: String -> Maybe String
    const at = word => {
        // value :: String
        const value = LIST[word];
        return value === undefined ? null : `help.html#index_${value}`;
    };

    return {
        // Help.open :: Maybe String -> ()
        open: word => {
            if(word === '') {
                window.open('help.html', '_blank');
                return;
            }
            // link :: Maybe String
            const link = at(word);
            if(link === null) {
                Notice.set(
                    'error: ',
                    Help.makeLink('help'), ' ',
                    Notice.AttrString.makeError(word)
                );
                return;
            }
            window.open(link, '_blank');
        },
        // Help.makeLink :: String -> AttrString
        makeLink: word => {
            // link :: Maybe String
            const link = at(word);
            if(link === null) throw `"${word}" is an invalid help string`;
            return Notice.AttrString.makeTagString(
                'a', {href: link, target: '_blank'}, word
            );
        }
    };
})();

const History = (() => {
    const strs = []; // strs :: [String]
    let index = 0; // index :: NaturalNumber
    let tempStr = ''; // tempStr :: String

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
            if(index === 0) {
                return strs.length === 0 ? tempStr : strs[0];
            } else {
                --index;
                return strs[index];
            }
        },
        // History.down :: String -> String
        down: str => {
            if(index === strs.length) {
                return str;
            } else {
                ++index;
                return index === strs.length ? tempStr : strs[index];
            }
        },
        // History.reset :: () -> ()
        reset: () => {
            strs.length = 0;
            index = 0;
            tempStr = '';
        }
    };
})();

const Input = (() => {
    // buttonControl :: () -> ()
    const buttonControl = () => {
        const isEmpty = Input.get() === ''; // isEmpty :: Bool
        dgebi('cui_submit').style.display = isEmpty ? 'none' : 'inline';
    };
    dgebi('text_cui_form').addEventListener('input', buttonControl);

    return {
        // Input.get :: () => String
        get: () => document.cui_form.input.value,
        // Input.set :: String -> ()
        set: str => {
            document.cui_form.input.value = str;
            buttonControl();
        }
    };
})();

const Notice = (() => {
    const TEXT      = 't'; // TEXT      :: String
    const HTML      = 'h'; // HTML      :: String
    const UNDERLINE = 'u'; // UNDERLINE :: String
    let id = undefined; // id :: Maybe TimeoutID

    // isString :: Object -> Bool
    const isString = x => typeof(x) === 'string';
    // toAttrString :: [String | AttrString] -> [AttrString]
    const toAttrString = arr => {
        return arr.map(x => isString(x) ? Notice.AttrString.init(x) : x)
    };

    return {
        // Notice.set :: [(String | AttrString)] -> ()
        set: (...arr) => {
            arr = toAttrString(arr)
            // attrStr :: AttrString
            const attrStr = {
                str:  arr.map(x => x.str).join(''),
                attr: arr.map(x => x.attr).join('')
            };
            // format :: (String -> String, String -> String) -> Object
            const format = (textFunc, htmlFunc) => {
                // reg :: RegExp
                const reg = new RegExp(`[${HTML}]+|[^${HTML}]+`, 'dg');
                // arr :: [String]
                return [...attrStr.attr.matchAll(reg)].map(x => {
                    // it :: [IntegerNumber]
                    const it = x.indices[0];
                    // t :: String
                    const t = attrStr.str.substring(it[0], it[1]);
                    if(attrStr.attr[it[0]] === HTML) {
                        return htmlFunc(t);
                    } else { // attrStr.attr[it[0]] === TEXT
                        return textFunc(t);
                    }
                }).join('');
            };
            dgebi('notice').innerHTML = format(htmlEscape, x => x);
            // log :: [String]
            const log = [`notice> ${format(x => x, x => '')}`];
            // underline :: [String]
            const underline = (() => {
                // reg :: RegExp
                const reg = new RegExp(`${UNDERLINE}+`, 'g');
                // ret :: String
                const ret = attrStr.attr.replace(new RegExp(TEXT, 'g'), ' ')
                                        .replace(new RegExp(HTML, 'g'), '')
                                        .replace(reg, match => {
                                            // len :: IntegerNumber
                                            const len = match.length - 1;
                                            return `^${'~'.repeat(len)}`;
                                        });
                return ret === '' ? [] : `        ${ret}`;
            })();
            // links :: [String]
            const links = (() => {
                // aElements :: [Element]
                const elements = dgebi('notice').getElementsByTagName('a');
                return [...elements].map(x => `${x.innerText}: ${x.href}`);
            })();
            console.log(log.concat(underline, links).join('\n'));
            id = window.setTimeout(Notice.clear, NOTICE_CLEAR_TIME);
        },
        // Notice.clear :: () -> ()
        clear: () => {
            if(id === undefined) return;
            window.clearTimeout(id);
            const select = window.getSelection(); // select :: Selection
            if(select.toString().length > 0) {
                if(select.getRangeAt(0).intersectsNode(dgebi('notice'))) {
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
        },
        AttrString: {
            // Notice.AttrString.init :: (String, Maybe String) -> AttrString
            init: (str, attr = TEXT) => {
                // n :: IntegerNumber
                const n = Math.ceil(str.length / attr.length);
                return {str: str, attr: attr.repeat(n).slice(0, str.length)}
            },
            // Notice.AttrString.concat :: [String | AttrString] -> AttrString
            concat: arr => {
                arr = toAttrString(arr)
                return {
                    str:  arr.map(x => x.str).join(''),
                    attr: arr.map(x => x.attr).join('')
                };
            },
            // Notice.AttrString.join :: [String | AttrString] -> AttrString
            join: arr => {
                arr = toAttrString(arr);
                return {
                    str:  arr.map(x => x.str).join(' '),
                    attr: arr.map(x => x.attr).join(TEXT)
                };
            },
            // Notice.AttrString.makeTagString ::
            //         (String, Maybe Object, Maybe (String | AttrString)) ->
            //             AttrString
            makeTagString: (tagName, obj = {}, body = null) => {
                // NAS :: Object
                const NAS = Notice.AttrString;
                if(isString(body)) {
                    body = NAS.init(body);
                }
                // e :: [[String]]
                const e = Object.entries(obj);
                // t :: String
                const t = `${e.map(x => `${x[0]}="${x[1]}"`).join(' ')}`;
                // begin :: AttrString
                const begin = NAS.init(`<${tagName} ${t}>`, HTML);
                if(body === null) {
                    return begin;
                } else {
                    // end :: AttrString
                    const end = NAS.init(`</${tagName}>`, HTML);
                    return NAS.concat([begin, body, end]);
                }
            },
            // Notice.AttrString.makeError :: String -> AttrString
            makeError: str => {
                // NAS :: Object
                const NAS = Notice.AttrString;
                // red :: Object
                const red = {class: 'color_red'};
                return NAS.makeTagString('span', red, NAS.init(str, UNDERLINE));
            }
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
            items.pop().split(SEPARATOR).forEach(x => parseMain(x, PRIVATE));
        },
        // Trash.reset :: () -> ()
        reset: () => items.length = 0
    }
})();

const Sound = (() => {
    const sounds = []; // sounds :: Map String Audio
    let volume = 100; // volume :: NaturalNumber
    let mute = 1; // mute :: BoolNumber

    return {
        // Sound.setVolume :: String -> ()
        setVolume: str => {
            const n = parseInt10(str); // n :: Maybe NaturalNumber
            if(n < 0 || n > 100 || !/^\d+$/.test(str)) {
                Notice.set(
                    'error: ',
                    Help.makeLink('volume'), ' ',
                    Notice.AttrString.makeError(str)
                );
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
                default:
                    throw 'not reachable';
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
            range(NUMBER_OF_SOUNDS).forEach(i => {
                const url = `sound/alarm${i}.mp3`; // url :: String
                sounds[url] = new Audio(url);
                sounds[url].muted = true;
                sounds[url].onloadeddata = e => sounds[url].play();
            });
        },
        // Sound.play :: (String, String) -> ()
        play: (url, id) => {
            if(sounds[url] === undefined || sounds[url].readyState < 2) {
                console.log(`failed to play: ${url}`);
                return;
            }
            const sound = new Audio(); // sound :: Audio
            sound.src = sounds[url].src;
            sound.volume = volume / 100 * mute;
            sound.currentTime = 0;
            sound.play();
            // isPlay :: Bool
            const isPlay = TaskQueue.isPlay(id);
            // soundId :: NaturalNumber
            const soundId = TaskQueue.setSound(sound, id);
            sound.addEventListener('ended', () => {
                TaskQueue.removeSound(id, soundId);
                if(TaskQueue.isPlay(id)) return;
                removeDom(`stopButton_${id}`);
            }, {once: true});
            if(isPlay) return;
            dgebi(`task_${id}`).innerHTML += makeTagString('input', {
                id: `stopButton_${id}`,
                type: 'button',
                value: 'stop',
                onclick: `parseMain('#stop $${id}', '${PRIVATE}');`
            });
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
            Notice.set(`new version ${VERSION.join('.')}`);
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
            parse(data, PRIVATE);
        },
        // Load.fromString :: () -> ()
        fromString: () => {
            // text :: Maybe Base64String
            const text = window.prompt('data to import:', '');
            if(text === '' || text === null) return;
            parseMain('#remove-macro *');
            parseMain('remove *#*;remove-tag *;remove-button *');
            parseMain('default 1a.;volume 100;mute-off;show-menu;hide-macro');
            parseMain('empty-trash;empty-history');
            parse(Base64.decode(text), PRIVATE);
            parseMain('#print loaded', PRIVATE);
        },
        // Load.mergeFromString :: () -> ()
        mergeFromString: () => {
            // text :: Maybe Base64String
            const text = window.prompt('data to merge:', '');
            if(text === '' || text === null) return;
            parse(Base64.decode(text), MERGE);
            parseMain('#print merged', PRIVATE);
        }
    };
})();

const Button = (() => {
    let buttonCount = 0; // buttonCount :: NaturalNumber
    const buttons = []; // buttons :: [ButtonObject]

    // add :: (ButtonObject, Maybe NaturalNumber) -> ()
    const add = (obj, insertIndex) => {
        // element :: Element
        const element = document.createElement('span');
        element.innerHTML = `${makeTagString('input', {
            type: 'button',
            value: htmlEscape(obj.str),
            onclick: `parseMain('${jshtmlEscape(obj.str)}');`
        })} `;
        Util.insert(buttons, obj, element, 'button', undefined, insertIndex);
    };
    // rm :: [Maybe NaturalNumber] -> ()
    const rm = indices => {
        indices = indices.filter(x => x !== undefined);
        if(indices.length === 0) return;
        // items :: [ButtonObject]
        const items = indices.map(i => buttons[i]);
        Trash.push(items.map(item => item.saveText()).join(SEPARATOR));
        items.map(x => x.id).forEach(id => {
            removeDom(`button_${id}`);
            buttons.splice(buttons.findIndex(x => x.id === id), 1);
        });
    };
    // updateIndex :: () -> ()
    const updateIndex = () => {
        Util.updateIndex('button_', buttons.map(x => x.id), x => x.children[0]);
    };

    return {
        // Button.insert ::
        //     (String, Maybe DateNumber, Maybe NaturalNumber) -> ()
        insert: (str, now = null, insertIndex = undefined) => {
            if(str === undefined) return;
            // isIndexNull :: Bool
            const isIndexNull = insertIndex === undefined;
            if(!isIndexNull) {
                now = buttons[insertIndex].time;
            }
            // isDateNull :: Bool
            const isDateNull = now === null;
            // buttonItem :: ButtonObject
            const buttonItem = {
                id: buttonCount,
                str: str,
                time: isDateNull ? Date.now() : now,
                saveText: () => `#$button ${buttonItem.time}#${buttonItem.str}`
            };
            if(!isDateNull && isIndexNull) {
                // thisSaveText :: String
                const thisSaveText = buttonItem.saveText();
                // isEq :: ButtonObject -> Bool
                const isEq = x => {
                    return x.saveText() === thisSaveText && x.time === now;
                };
                if(buttons.findIndex(isEq) >= 0) return;
            }
            ++buttonCount;
            add(buttonItem, insertIndex);
            updateIndex();
        },
        // Button.insertByData :: String -> ()
        insertByData: str => Util.insertByData(str, Button.insert),
        // Button.order :: String -> ()
        order: str => Util.order(str, buttons, 'button'),
        // Button.edit :: String -> ()
        edit: str => Util.edit(Button, 'button', str),
        // Button.modify :: String -> ()
        modify: str => {
            // parseResult :: Maybe Object
            const parseResult = /^(\d+) +(.+)$/.exec(str);
            if(parseResult === null) {
                Notice.set(
                    'error: ',
                    Help.makeLink('modify-button'), ' ',
                    Notice.AttrString.makeError(str)
                );
                return;
            }
            // index :: NaturalNumber
            const index = parseInt10(parseResult[1]);
            Button.insert(parseResult[2], null, index - 1);
            rm([index]);
        },
        // Button.remove :: String -> ()
        remove: str => {
            if(str === '') return;
            // result :: IndexObject
            const result = Util.parameterCheck(str, buttons.length);
            rm(result.data);
            if(result.isErr) {
                Notice.set(
                    'error: ',
                    Help.makeLink('remove-button'), ' ',
                    result.str
                );
            }
            updateIndex();
        },
        // Button.getEvalObject :: () -> Object
        getEvalObject: () => Util.getEvalObject(buttons, 'button'),
        // Button.save :: () -> [String]
        save: () => buttons.map(x => x.saveText())
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
            const target = dgebi(`text_${id}`); // target :: Maybe Element
            // console.assert(target !== null);
            target.innerText += '!'.repeat(importance);
            Tag.emphUp(index, importance);
            dgebi(`time_${id}`).removeAttribute('onclick');
            switch(importance) {
                case 3:
                    window.setTimeout(
                        window.alert,
                        ALERT_WAIT_TIME,
                        target.innerText
                    );
                    // fallthrough
                case 2:
                    target.className = 'background-color_red';
                    BackgroundAlert.up();
                    break;
                case 1:
                    target.className = 'background-color_yellow';
                    break;
                case 0:
                    target.style.textDecoration = 'line-through';
                    window.setTimeout(
                        parseMain,
                        AUTO_REMOVE_TIME,
                        `#remove $${id}`, PRIVATE
                    );
                    break;
                default:
                    throw 'not reachable';
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

    // add :: (MacroObject, Maybe NaturalNumber) -> ()
    const add = (obj, insertIndex) => {
        const element = document.createElement('li'); // element :: Element
        // tag :: String
        const tag = makeTagString('input', {
            type: 'button',
            value: 'remove',
            onclick: `parseMain('#remove-macro $${obj.id}', '${PRIVATE}');`
        });
        element.innerHTML =
                `${tag} ${htmlEscape(obj.str.replace(regex, '$1 -> $2'))}`;
        Util.insert(macros, obj, element, 'macro', undefined, insertIndex);
    };
    // escape :: String -> String
    const escape = str => {
        const t = str.replace(/(?<!\\)\\*(?=(-|=)>)/g, match => {
            return '\\\\'.repeat(match.length);
        });
        return t.replace(/=>/g, '\\=>').replace(/->/g, '=>');
    };
    // rm :: [Maybe NaturalNumber] -> ()
    const rm = indices => {
        indices = indices.filter(x => x !== undefined);
        if(indices.length === 0) return;
        // items :: [MacroObject]
        const items = indices.map(i => macros[i]);
        Trash.push(items.map(item => item.saveText()).join(SEPARATOR));
        if(!isListShow) {
            Notice.set(`removed: ${items.map(item => item.str).join(' , ')}`);
        }
        items.map(x => x.id).forEach(id => {
            removeDom(`macro_${id}`);
            macros.splice(macros.findIndex(x => x.id === id), 1);
        });
    };

    return {
        // Macro.insert ::
        //     (String, Maybe DateNumber, Maybe NaturalNumber) -> Bool
        insert: (s, now = null, insertIndex = undefined) => {
            const result = regex.exec(s); // result :: Maybe Object
            if(result === null || result[1] === '') return FAILURE;
            // console.assert(result[2] !== null);
            const id = macroCount; // id :: NaturalNumber
            // isIndexNull :: Bool
            const isIndexNull = insertIndex === undefined;
            if(!isIndexNull) {
                now = macros[insertIndex].time;
            }
            // isDateNull :: Bool
            const isDateNull = now === null;
            if(isDateNull) {
                now = Date.now();
            }
            // macroKey :: Maybe RegExp
            const macroKey = (() => {
                try {
                    return new RegExp(result[1], 'gu');
                } catch(e) {
                    return null;
                }
            })();
            if(macroKey === null) {
                Notice.set(
                    'error: ',
                    Notice.AttrString.makeError(result[1]),
                    ` -> ${result[2]}`
                );
                return SUCCESS;
            }
            // macroItem :: MacroObject
            const macroItem = {
                key: macroKey,
                str: s,
                value: result[2],
                id: id,
                time: now,
                saveText: () => `-> ${macroItem.time}#${macroItem.str}`
            };
            if(!isDateNull && isIndexNull) {
                // isEq :: MacroObject -> Bool
                const isEq = x => {
                    // saveText :: String
                    const saveText = macroItem.saveText();
                    return x.saveText() === saveText && x.time === now;
                };
                if(macros.findIndex(isEq) >= 0) return SUCCESS;
            }
            ++macroCount;
            add(macroItem, insertIndex);
            if(!isListShow && isDateNull) {
                Notice.set(`macro: ${result[1]} -> ${result[2]}`);
            }
            return SUCCESS;
        },
        // Macro.insertByData :: String -> ()
        insertByData: str => Util.insertByData(str, Macro.insert),
        // Macro.replace :: String -> String
        replace: s => {
            macros.forEach(x => s = s.replace(x.key, x.value));
            return s;
        },
        // Macro.order :: String -> ()
        order: str => Util.order(str, macros, 'macro'),
        // Macro.edit :: String -> ()
        edit: str => Util.edit(Macro, 'macro', str),
        // Macro.modify :: String -> Bool
        modify: str => {
            if(!/^modify-macro /.test(str)) return FAILURE;
            str = str.replace(/^modify-macro +/, '');
            // parseResult :: Maybe Object
            const parseResult = /^(\d+) +(.+)$/.exec(str);
            if(parseResult === null) {
                Notice.set(
                    'error: ',
                    Help.makeLink('modify-macro'), ' ',
                    Notice.AttrString.makeError(str)
                );
                return SUCCESS;
            }
            // index :: NaturalNumber
            const index = parseInt10(parseResult[1]);
            // unescaped :: String
            const unescaped = parseResult[2].replace(/(?<!\\)\\*=>/g, match => {
                // len :: NaturalNumber
                const len = match.length - 2;
                // backslash :: String
                const backslash = '\\'.repeat(Math.floor(len / 2));
                // arrow :: String
                const arrow = len % 2 === 0 ? '->' : '=>';
                return `${backslash}${arrow}`;
            });
            if(Macro.insert(unescaped, null, index - 1) === FAILURE) {
                Notice.set(
                    'error: ',
                    Help.makeLink('modify-macro'),
                    ` ${parseResult[1]} `,
                    Notice.AttrString.makeError(parseResult[2])
                );
                return SUCCESS;
            }
            rm([index]);
            return SUCCESS;
        },
        // Macro.remove :: (String, String) -> ()
        remove: (str, callFrom) => {
            if(str === '') return;
            if(callFrom === PRIVATE) {
                // idResult :: Maybe Object
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
                Notice.set(
                    'error: ',
                    Help.makeLink('remove-macro'), ' ',
                    result.str
                );
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
        // Macro.getEvalObject :: () -> Object
        getEvalObject: () => Util.getEvalObject(macros, 'macro', escape),
        // Macro.save :: () -> [String]
        save: () => {
            // displayInst :: String
            const displayInst = isListShow ? 'show-macro' : 'hide-macro';
            return [displayInst, ...macros.map(x => x.saveText())];
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
    const format = () => `${defaultSound}${defaultDisplay}${importanceStr()}`;
    // timer :: (String, DateNumber) -> Maybe DateNumber
    const timer = (s, now) => {
        // regex :: RegExp
        const regex =
                /^((?:(\d+),)?(\d*?)(\d{0,2})(?:\.(\d+))?)$|^((?:(.*)d)?(?:(.*)h)?(?:(.*)m)?(?:(.*)s)?)$/;
        const result = regex.exec(s); // result :: Maybe Object
        if(s === '' || result === null) return null;
        // correct : NaturalNumber
        const correct = result[1] !== undefined ? 2 : 7;
        // ret :: Maybe NaturalNumber
        const ret = [86400, 3600, 60, 1].map((t, i) => [result[i + correct], t])
                                        .filter(x => x[0] !== undefined)
                                        .map(x => Number(`0${x[0]}`, 10) * x[1])
                                        .reduce((a, b) => a + b, 0);
        return isNaN(ret) ? null : now + 1000 * ret;
    };
    // alarm :: (String, DateNumber) -> Maybe DateNumber
    const alarm = (s, now) => {
        // regex :: RegExp
        const regex = /^(?:(?:(\d*)-)?(\d*)-(\d*),)?(\d*):(\d*)(?::(\d*))?$/;
        // result :: Maybe Object
        const result = regex.exec(s);
        if(result === null) return null;
        // isFind :: Bool
        let isFind = false;
        // isFree :: [NaturalNumber]
        const isFree = [];
        // table :: [Object]
        const table = [
            {get: 'getFullYear', set: 'setFullYear', c: 0, r: 0},
            {get: 'getMonth', set: 'setMonth', c: -1, r: 0},
            {get: 'getDate', set: 'setDate', c: 0, r: 1},
            {get: 'getHours', set: 'setHours', c: 0, r: 0},
            {get: 'getMinutes', set: 'setMinutes', c: 0, r: 0},
            {get: 'getSeconds', set: 'setSeconds', c: 0, r: 0}
        ];
        // ret :: Date
        let ret = new Date(now);
        ret.setMilliseconds(500);
        range(6).map(i => {
            const t = table[i]; // t :: Object
            if(result[i + 1] !== '' && result[i + 1] !== undefined) {
                // target :: NaturalNumber
                const target = parseInt10(result[i + 1]) + t.c;
                do {
                    ret[t.set](target);
                } while(ret[t.get]() !== target);
                isFind = true;
            } else if(isFind) {
                ret[t.set](t.r);
            } else {
                isFree.push(i);
            }
        });
        while(now >= ret.getTime() - UPDATE_TIME / 2 && isFree.length > 0) {
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
                // result :: Maybe Object
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
            Notice.set(`default: ${format()}`);
            return;
        },
        // Task.parse :: (String, String) -> Maybe TaskObject
        parse: (s, callFrom) => {
            // regHead :: String
            const regHead = callFrom === GLOBAL
                    ? '^(?:()())?'
                    : '^(?:(\\d+)([at]))?';
            // regex :: RegExp
            const regex = new RegExp(
                `${regHead}([^\\/]*)((?:\\/(?:(-|\\d+)|([^\\/]*?)\\*)??([at])?(\\.|!{1,3})?(?:#([^ \\/]*))?(?:\\/(.*))?)?)$`
            );
            const result = regex.exec(s); // result :: Maybe Object
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
            if(result[3].slice(-2) === '++') {
                result[3] += result[3].slice(0, -2);
            }
            // plusSplit :: Maybe Object
            const plusSplit = /^([^\+]*?)(?:\+(.*))?$/.exec(result[3]);
            // console.assert(plusSplit !== null || plusSplit[1] !== undefined);
            ret.time = timer(plusSplit[1], now) ?? alarm(plusSplit[1], now);
            if(ret.time === null) return null;
            ret.isValid = ret.time - Date.now() >= -UPDATE_TIME / 2;
            ret.tipText = result[3];
            switch(plusSplit[2]) {
                case undefined:
                    break;
                case '':
                    execs.push(`${plusSplit[1]}+${result[4]}`);
                    break;
                default:
                    if(plusSplit[2][0] === '+') {
                        const rest = plusSplit[2].slice(1); // rest :: String
                        execs.push(`${rest}++${rest}${result[4]}`);
                    } else {
                        execs.push(`${plusSplit[2]}${result[4]}`);
                    }
                    break;
            }
            ret.tipText += '/';
            if(result[5] !== undefined) {
                execs.push(`#sound ${result[5]}`);
                ret.tipText += result[5];
            } else if(result[6] !== undefined) {
                execs.push(result[6]);
                ret.tipText += `${result[6]}*`;
            } else {
                execs.push(`#sound ${defaultSound}`);
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
                ret.rawName = result[10];
                ret.name = htmlEscape(result[10]);
                ret.saveRawName = `/${result[10]}`;
            } else {
                ret.rawName = plusSplit[1];
                ret.name = plusSplit[1];
                ret.saveRawName = '';
            }
            ret.exec = execs.join(';');
            ret.getTag = () => ret.tag === undefined ? '' : `#${ret.tag}`;
            ret.makeSaveText = () => [
                ret.when,
                ret.display,
                ret.tipText,
                ret.getTag(),
                ret.saveRawName
            ].join('');
            ret.getInputString = () => {
                return `${ret.tipText}${ret.getTag()}${ret.saveRawName}`;
            };
            return ret;
        },
        // Task.init :: () -> ()
        init: () => {
            // setDefault :: (String, a) -> ()
            const setDefault = (id, value) => {
                const elements = dgebi(id).children; // elements :: [Element]
                for(let i = 0; i < elements.length; ++i) { // i :: NaturalNumber
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
        save: () => ([`default ${format()}`])
    };
})();

const Tag = (() => {
    let tagCount = 0; // tagCount :: NaturalNumber
    const tagTable = []; // tagTable :: [TagObject]

    // getIndexById :: Maybe NaturalNumber -> Maybe NaturalNumber
    const getIndexById = id => {
        if(id === undefined) {
            return undefined;
        } else {
            return tagTable.findIndex(x => x.id === id);
        }
    };
    // parameterCheck :: String -> IDObject
    const parameterCheck = str => {
        // ret :: [IndexObject]
        const ret = str.split(' ').map(x => {
            const result = /^#(.*)$/.exec(x); // result :: Maybe Object
            if(result !== null) {
                // index :: Maybe NaturalNumber
                const index = tagTable.findIndex(t => t.str === result[1]);
                const isErr = index === -1; // isErr :: Bool
                return {
                    data: isErr ? undefined : index,
                    isErr: isErr,
                    str: isErr ? Notice.AttrString.makeError(x) : x
                };
            }
            return Util.parameterCheck(x, tagTable.length);
        });
        // nubData :: [Maybe NaturalNumber]
        const nubData = unique(ret.map(x => x.data).flat());
        // indexData :: [NaturalNumber]
        const indexData = nubData.filter(x => x !== undefined);
        return {
            data: indexData.map(x => ({index: x, id: tagTable[x].id})),
            isErr: ret.some(x => x.isErr),
            str: Notice.AttrString.join(ret.map(x => x.str))
        };
    };
    // add :: (TagObject, Maybe NaturalNumber) -> ()
    const add = (obj, insertIndex) => {
        // element :: Element
        const element = document.createElement('div');
        element.innerHTML = (() => {
            // name :: String
            const name = `#${jshtmlEscape(obj.str)}`;
            // disp :: String
            const disp = makeTagString('span', {
                id: `tag_name_${obj.id}`,
                onclick: `parseMain('#toggle-tag ${name}');`
            }, `#${htmlEscape(obj.str)}`);
            // rmButton :: String
            const rmButton = makeTagString('input', {
                id: `remove_tag_${obj.id}`,
                type: 'button',
                value: 'remove',
                onclick: `parseMain('#remove-tag ${name}');`
            });
            return `<span closed>${disp} ${rmButton}</span>${
                makeTagString('div', {style:'padding-left: 0px'}, makeTagString(
                    'ol', {id: `task_parent_${obj.id}`}, ''
                ))
            }`;
        })();
        Util.insert(tagTable, obj, element, 'tag', undefined, insertIndex);
    };
    // rm :: [IDObject] -> String
    const rm = obj => {
        if(obj.length === 0) return '';
        const items = obj.map(x => tagTable[x.index]); // items :: [TagObject]
        Trash.push(items.map(item => item.saveText()).join(SEPARATOR));
        // ret :: [String]
        const ret = obj.map(x => {
            const index = getIndexById(x.id); // index :: NaturalNumber
            if(TaskQueue.isTagEmpty(x.id)) {
                removeDom(`tag_${x.id}`);
                tagTable.splice(index, 1);
                return '';
            } else {
                return `#${tagTable[index].str} is not empty`;
            }
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
                        const target = dgebi(`tag_${x.id}`).children[0];
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
                        const target = dgebi(`tag_${x.id}`).children[0];
                        // console.assert(target !== undefined);
                        offsetManage(() => {
                            target.removeAttribute('open');
                            target.setAttribute('closed', '');
                        });
                    };
                case 'toggle':
                    return x => {
                        tagTable[x.index].isOpen = !tagTable[x.index].isOpen;
                        detailsToggle(dgebi(`tag_${x.id}`).children[0]);
                    };
                default:
                    throw 'not reachable';
            }
        })();
        obj.forEach(func);
    };
    // updateIndex :: () -> ()
    const updateIndex = () => {
        Util.updateIndex('tag_name_', tagTable.map(x => x.id));
    };

    return {
        // Tag.getLength :: () -> NaturalNumber
        getLength: () => tagTable.length,
        // Tag.insert :: (String, Maybe DateNumber, Maybe NaturalNumber) -> ()
        insert: (str, now = null, insertIndex = undefined) => {
            // isIndexNull :: Bool
            const isIndexNull = insertIndex === undefined;
            if(!isIndexNull) {
                now = tagTable[insertIndex].time;
            }
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
                    return {isErr: true, str: Notice.AttrString.makeError(x)};
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
                        if(tagItem.isOpen) {
                            return `${head};#toggle-tag #${tagItem.str}`
                        } else {
                            return head;
                        }
                    }
                };
                ++tagCount;
                add(tagItem, insertIndex);
                TaskQueue.newTag(tagItem.id);
                return successObj;
            });
            if(tmp.some(x => x.isErr)) {
                Notice.set(
                    'error: ',
                    Help.makeLink('tag'), ' ',
                    Notice.AttrString.join(tmp.map(x => x.str))
                );
            }
            updateIndex();
        },
        // Tag.insertByData :: String -> ()
        insertByData: str => Util.insertByData(str, Tag.insert),
        // Tag.order :: String -> ()
        order: str => Util.order(str, tagTable, 'tag'),
        // Tag.edit :: String -> ()
        edit: str => {
            if(/^\d$/.test(str)) {
                Util.edit(Tag, 'tag', str);
                return;
            }
            // parseResult :: Maybe IDObject
            const parseResult = parameterCheck(str);
            if(parseResult.data.length !== 1) {
                Notice.set(
                    'error: ',
                    Help.makeLink('edit-tag'), ' ',
                    Notice.AttrString.makeError(str)
                );
                return;
            }
            const index = parseResult.data[0].index; // index :: NaturalNumber
            Input.set(`modify-tag ${index + 1} ${tagTable[index].str}`);
        },
        // Tag.modify :: String -> String
        modify: str => {
            // parseResult :: Maybe Object
            const parseResult = /^([^ ]+) +([^ ]+)$/.exec(str);
            if(parseResult === null) {
                Notice.set(
                    'error: ',
                    Help.makeLink('modify-tag'), ' ',
                    Notice.AttrString.makeError(str)
                );
                return '';
            }
            // idObj :: Maybe IDObject
            const idObj = parameterCheck(parseResult[1]);
            if(idObj.data.length !== 1) {
                Notice.set(
                    'error: ',
                    Help.makeLink('modify-tag'), ' ',
                    Notice.AttrString.makeError(parseResult[1]),
                    ` ${parseResult[2]}`
                );
                return '';
            }
            const index = idObj.data[0].index; // index :: NaturalNumber
            const item = tagTable[index]; // item :: TagObject
            if(item.str === parseResult[2]) return '';
            if(Tag.findIndex(parseResult[2]) !== -1) {
                Notice.set(
                    'error: ',
                    Help.makeLink('modify-tag'),
                    ` ${parseResult[1]} `,
                    Notice.AttrString.makeError(parseResult[2])
                );
                return '';
            }
            Tag.insert(parseResult[2], null, index);
            // move :: String
            const move = `##move#${parseResult[2]} *#${item.str};`;
            // remove :: String
            const remove = `#remove-tag ${index + 2}`;
            // toggle :: String
            const toggle = item.isOpen ? `;#toggle-tag ${index + 2}` : '';
            return `${move}${remove}${toggle}`;
        },
        // Tag.remove :: String -> ()
        remove: str => {
            if(str === '') return;
            const result = parameterCheck(str); // result :: IDObject
            const info = rm(result.data); // info :: String
            if(result.isErr || info !== '') {
                Notice.set(
                    'error: ',
                    Help.makeLink('remove-tag'), ' ',
                    result.str,
                    info === '' ? '' : ` , ${info}`
                );
            }
            updateIndex();
        },
        // Tag.findIndex :: Maybe String -> Maybe NaturalNumber
        findIndex: str => {
            if(str === undefined) {
                return undefined;
            } else {
                // ret :: Maybe NaturalNumber
                const ret = tagTable.findIndex(x => x.str === str);
                return ret === -1 ? -1 : tagTable[ret].id;
            }
        },
        // Tag.showRemoveButton :: NaturalNumber -> ()
        showRemoveButton: id => {
            if(getIndexById(id) === -1) return;
            dgebi(`remove_tag_${id}`).style.display = null;
        },
        // Tag.hideRemoveButton :: NaturalNumber -> ()
        hideRemoveButton: id => {
            dgebi(`remove_tag_${id}`).style.display = 'none';
        },
        // Tag.emphUp :: (Maybe NaturalNumber, NaturalNumber) -> ()
        emphUp: (id, importance) => {
            if(id === undefined) return;
            const index = getIndexById(id); // index :: Maybe NaturalNumber
            switch(importance) {
                case 1:
                    ++tagTable[index].numYellow;
                    break;
                case 2:
                case 3:
                    ++tagTable[index].numRed;
                    break;
                default:
                    return;
            }
            const target = dgebi(`tag_name_${id}`); // nameId :: Maybe String
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
                    --tagTable[index].numYellow;
                    break;
                case 2:
                case 3:
                    --tagTable[index].numRed;
                    break;
                default:
                    return;
            }
            if(tagTable[index].numRed > 0) return;
            const target = dgebi(`tag_name_${id}`); // nameId :: Maybe String
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
                Notice.set(
                    'error: ',
                    Help.makeLink(`${flag}-tag`), ' ',
                    result.str
                );
            }
        },
        // Tag.isValidName :: String -> Bool
        isValidName: str => !/\//.test(str) && str !== '*',
        // Tag.getEvalObject :: () -> Object
        getEvalObject: () => Util.getEvalObject(tagTable, 'tag'),
        // Tag.save :: () -> [String]
        save: () => tagTable.map(x => x.saveText())
    };
})();

const TaskQueue = (() => {
    const taskQueue = []; // taskQueue :: [[TaskObject]]
    let idCount = 0; // idCount :: NaturalNumber

    taskQueue[undefined] = [];
    taskQueue[undefined][-1] = {id: GLOBAL, sound: [], soundCount: 0};

    // deadlineStr :: (DateNumber, DateNumber) -> String
    const deadlineStr = (deadline, now) => {
        const deadlineObj = new Date(deadline); // deadlineObj :: Date
        const ret = []; // ret :: [String]
        if(Math.abs(deadline - now) >= 86400000) {
            if(Math.abs(deadline - now) >= 86400000 * 365) {
                ret.push(`${deadlineObj.getFullYear()}-`);
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
            // invalidResult :: Maybe Object
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
            const errObj = {isErr: true, str: Notice.AttrString.makeError(x)};
            // decomp :: Maybe Object
            const decomp = /^([^#]*)(?:#(.*))?$/.exec(x);
            // tagNo :: Maybe NaturalNumber
            const tagNo = Tag.findIndex(decomp[2]);
            if(tagNo === -1) return errObj;
            // max :: NaturalNumber
            const max = taskQueue[tagNo].length;
            // parseResult :: Maybe Object
            const parseResult = Util.parseRangeString(decomp[1], max);
            if(parseResult === null) {
                return errObj;
            } else {
                return makeObj(parseResult.map(t => taskQueue[tagNo][t]));
            }
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
            str: Notice.AttrString.join(ret.map(x => x.str))
        };
    };
    // getTagIndex :: String -> Maybe IDObject
    const getTagIndex = id => {
        if(id === GLOBAL) return {index: -1, id: GLOBAL, tagNo: undefined};
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
                : flag === '-timer' ? (x => 't') : x => x === 'a' ? 't' : 'a';
        ids.forEach(x => {
            // result :: String
            const result = func(taskQueue[x.tagNo][x.index].display);
            taskQueue[x.tagNo][x.index].display = result;
        });
    };
    // add :: (TaskObject, Maybe NaturalNumber) -> ()
    const add = (obj, index) => {
        // element :: Element
        const element = document.createElement('li');
        element.innerHTML = (() => {
            // rmButton :: String
            const rmButton = makeTagString('input', {
                type: 'button',
                value: 'remove',
                onclick: `parseMain('#remove $${obj.id}', '${PRIVATE}');`
            });
            // name :: String
            const name = makeTagString('span', {
                id: `text_${obj.id}`,
                title: obj.tipText
            }, obj.name);
            // time :: String
            const time = makeTagString('span', {
                id: `time_${obj.id}`,
                onclick: `parseMain('#switch $${obj.id}', '${PRIVATE}');`
            }, '');
            return `${rmButton} ${name}${time}`;
        })();
        // parentId :: String
        const parentId = `task_parent${index === undefined ? '' : `_${index}`}`;
        Util.insert(taskQueue[index], obj, element, 'task', index);
    };
    // rm :: ([Maybe IDObject], Bool) -> ()
    const rm = (ids, isNeedTrashPush = true) => {
        ids = ids.filter(x => x !== undefined);
        if(ids.length === 0) return;
        // items :: [TaskObject]
        const items = ids.map(x => taskQueue[x.tagNo][x.index]);
        if(isNeedTrashPush) {
            Trash.push(items.map(item => `#${item.makeSaveText()}`)
                            .join(SEPARATOR));
        }
        ids.forEach(x => {
            TaskQueue.stopSound(`\$${x.id}`, PRIVATE);
            removeDom(`task_${x.id}`);
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
            removeDom(`stopButton_${x.id}`);
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
            if(callFrom === PRIVATE) {
                // idResult :: Maybe Object
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
                Notice.set(
                    'error: ',
                    Help.makeLink(`switch${flag}`), ' ',
                    result.str
                );
            }
        },
        // TaskQueue.setSound :: (Audio, String) -> NaturalNumber
        setSound: (sound, id) => {
            // x :: Maybe IDObject
            const x = getTagIndex(id);
            // count :: NaturalNumber
            const count = taskQueue[x.tagNo][x.index].soundCount;
            sound.soundId = count;
            taskQueue[x.tagNo][x.index].sound.push(sound);
            ++taskQueue[x.tagNo][x.index].soundCount;
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
        // TaskQueue.tryInsert :: (String, String) -> Bool
        tryInsert: (str, callFrom) => {
            // taskItem :: Maybe TaskObject
            const taskItem = Task.parse(str, callFrom);
            if(taskItem === null) {
                return FAILURE;
            } else {
                TaskQueue.insert(taskItem, callFrom);
                return SUCCESS;
            }
        },
        // TaskQueue.insert :: (TaskObject, String) -> ()
        insert: (taskItem, flag) => {
            if(taskItem.tag !== undefined && Tag.findIndex(taskItem.tag) < 0) {
                Tag.insert(taskItem.tag);
            }
            const id = taskItem.id = String(idCount); // id :: String
            // index :: Maybe NaturalNumber
            const index = Tag.findIndex(taskItem.tag);
            if(flag === MERGE) {
                // isEq :: TaskObject -> Bool
                const isEq = x => x.makeSaveText() === taskItem.makeSaveText();
                if(taskQueue[index].some(isEq)) return;
            }
            ++idCount;
            taskItem.sound = [];
            taskItem.soundCount = 0;
            add(taskItem, index);
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
            // item :: [TaskObject]
            const item = result.data.map(x => taskQueue[x.tagNo][x.index]);
            const isTagValid = Tag.isValidName(tag); // isTagValid :: Bool
            if(isTagValid) {
                rm(result.data, false);
                item.forEach(x => {
                    x.tag = tag;
                    TaskQueue.insert(x, GLOBAL);
                });
            }
            if(result.isErr || !isTagValid) {
                // tagName :: String
                const tagName = tag === undefined ? '' : `#${tag}`;
                if(isTagValid) {
                    Notice.set(
                        'error: ',
                        Help.makeLink('move'), `${tagName} `,
                        result.str
                    );
                } else {
                    Notice.set(
                        'error: ',
                        Help.makeLink('move'),
                        Notice.AttrString.makeError(tagName), ' ',
                        result.str
                    )
                }
            }
        },
        // TaskQueue.edit :: String -> ()
        edit: str => {
            // obj :: [Object]
            const obj = TaskQueue.getEvalObject().task;
            // target :: Maybe Object
            const target = obj.find(x => x.index === str);
            if(target === undefined) {
                Notice.set(
                    'error: ',
                    Help.makeLink('edit'), ' ',
                    Notice.AttrString.makeError(str)
                );
                return;
            }
            Input.set(`modify ${str} ${target.input}`);
        },
        // TaskQueue.modify :: String -> ()
        modify: str => {
            // parseResult :: Maybe Object
            const parseResult = /^([^ ]+) +(.+)$/.exec(str);
            if(parseResult === null) {
                Notice.set(
                    'error: ',
                    Help.makeLink('modify'), ' ',
                    Notice.AttrString.makeError(str)
                );
                return;
            }
            const id = parameterCheck(parseResult[1]); // id :: IDObject
            if(id.data.length !== 1) {
                Notice.set(
                    'error: ',
                    Help.makeLink('modify'), ' ',
                    Notice.AttrString.makeError(parseResult[1]),
                    ` ${parseResult[2]}`
                );
                return;
            }
            // item :: TaskObject
            const item = taskQueue[id.data[0].tagNo][id.data[0].index];
            const when = item.when; // when :: String
            const display = item.display; // display :: String
            const text = `${when}${display}${parseResult[2]}`; // text :: String
            if(TaskQueue.tryInsert(text, PRIVATE) === FAILURE) {
                Notice.set(
                    'error: ',
                    Help.makeLink('modify'),
                    ` ${parseResult[1]} `,
                    Notice.AttrString.makeError(parseResult[2])
                );
                return;
            }
            rm(id.data);
        },
        // TaskQueue.remove :: (String, String) -> ()
        remove: (str, callFrom) => {
            if(callFrom === PRIVATE) {
                // idResult :: Maybe Object
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
                Notice.set(
                    'error: ',
                    Help.makeLink('remove'), ' ',
                    result.str
                );
            }
        },
        // TaskQueue.newTag :: NaturalNumber -> ()
        newTag: tagIndex => taskQueue[tagIndex] = [],
        // TaskQueue.isTagEmpty :: NaturalNumber -> Bool
        isTagEmpty: tagIndex => taskQueue[tagIndex].length === 0,
        // TaskQueue.stopSound :: (String, String) -> ()
        stopSound: (str, callFrom) => {
            if(callFrom === PRIVATE) {
                if(str === `$${GLOBAL}`) {
                    stop([getTagIndex(GLOBAL)]);
                    return;
                }
                // idResult :: Maybe Object
                const idResult = /^\$(\d+)$/.exec(str);
                if(idResult !== null) {
                    // console.assert(idResult[1] !== undefined);
                    stop([getTagIndex(idResult[1])]);
                    return;
                }
            }
            switch(str) {
                case '':
                    stop([getTagIndex(GLOBAL)]);
                    return;
                case '*':
                case '*#*':
                    stop([getTagIndex(GLOBAL)]);
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
                if(taskQueue[i][j] === undefined) {
                    return false;
                } else {
                    return now - taskQueue[i][j].time >= -interval / 2;
                }
            };
            // indices :: [Maybe NaturalNumber]
            const indices = taskQueue.map((t, i) => i);
            [undefined, ...indices.filter(t => t !== undefined)].forEach(i => {
                for(let j = 0; isLoop(i, j); ++j) { // j :: NaturalNumber
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
                dgebi(`time_${x.id}`).innerText = !x.isValid
                        ? `@${deadlineStr(x.time, now)}`
                        : x.display === 'a'
                            ? dlStr(x.time, now)
                            : restStr(x.time, now);
            });
        },
        // TaskQueue.getEvalObject :: () -> Object
        getEvalObject: () => {
            // taskIndex :: [Maybe NaturalNumber]
            const taskIndex  = [undefined, ...range(taskQueue.length)];
            // task :: [Object]
            const task = taskIndex.map(it => taskQueue[it].map((x, i) => {
                return Object.freeze({
                    index: `${i + 1}${x.getTag()}`,
                    tag:   x.tag ?? null,
                    name:  x.rawName,
                    input: x.getInputString()
                });
            })).flat();
            return {task: task};
        },
        // TaskQueue.save :: () -> [String]
        save: () => getAllObj().map(x => x.makeSaveText())
    };
})();

const Legacy = (() => {
    // parseVersion :: String -> [NaturalNumber]
    const parseVersion = version => {
        // result :: Maybe Object
        const result = /^ver (\d+)\.(\d+)\.(\d+)$/.exec(version);
        // console.assert(result !== null);
        return [result[1], result[2], result[3]].map(x => parseInt10(x));
    };
    // lessThan :: ([NaturalNumber], [NaturalNumber]) -> Bool
    const lessThan = (a, b) => {
        for(let i = 0; i < 3; ++i) { // i :: NaturalNumber
            if(a[i] !== b[i]) return a[i] < b[i];
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
        save: () => [`ver ${VERSION.join('.')}`]
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
        const target = event.target; // target :: Element
        if(target.tagName === 'INPUT' || target.tagName === 'SELECT') return;
        document.cui_form.input.focus();
    });
    dgebi('range_volume').addEventListener('input', () => {
        parseMain(`#volume ${dgebi('range_volume').value}`);
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
            const target = Input.get(); // target :: String
            switch(event.key) {
                case 'ArrowUp':
                    Input.set(History.up(target));
                    event.preventDefault();
                    break;
                case 'ArrowDown':
                    Input.set(History.down(target));
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
    dgebi('body').style.overflow = 'auto scroll';
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
