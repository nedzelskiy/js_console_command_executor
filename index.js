'use strict';

const stdin = process.stdin;
const terminate = require('terminate');
const parse = require('shell-quote').parse;
const FILENAME = `js-console-command-executor: pid[${ process.pid }]`;

const controls = {
    buffer: '',
    commandLine: '',
    cursorPosition: 0,
    typedCommands: [],
    typedCommandsPointer: -1
};

const actions = {

};

const doExit = () => {
    terminate(process.pid, 'SIGKILL', err => {
        if (err) {
            console.error(`${FILENAME} ERROR: `, err);
        } else {
            process.exit();
        }
    });
};

const rightCursorActionHandle = (controls) => {
    if (controls.cursorPosition < controls.buffer.length) {
        controls.cursorPosition++;
        process.stdout.cursorTo(controls.cursorPosition);
    }
};

const leftCursorActionHandle = (controls) => {
    if (controls.cursorPosition > 0) {
        controls.cursorPosition--;
        process.stdout.cursorTo(controls.cursorPosition);
    }
};

const upCursorActionHandle = (controls) => {
    if (controls.typedCommandsPointer >= 0) {
        process.stdout.clearLine();  // clear current text
        process.stdout.cursorTo(0);
        process.stdout.write(controls.typedCommands[controls.typedCommandsPointer]);
        controls.buffer = controls.typedCommands[controls.typedCommandsPointer];
        controls.typedCommandsPointer--;
        controls.cursorPosition = controls.buffer.length;
    } else {
        process.stdout.clearLine();  // clear current text
        process.stdout.cursorTo(0);
        controls.buffer = '';
        controls.cursorPosition = 0;
    }
};

const downCursorActionHandle = (controls) => {
    if (controls.typedCommandsPointer < controls.typedCommands.length - 1) {
        controls.typedCommandsPointer++;
        process.stdout.clearLine();  // clear current text
        process.stdout.cursorTo(0);
        process.stdout.write(controls.typedCommands[controls.typedCommandsPointer]);
        controls.buffer = controls.typedCommands[controls.typedCommandsPointer];
        controls.cursorPosition = controls.buffer.length;
    } else {
        process.stdout.clearLine();  // clear current text
        process.stdout.cursorTo(0);
        controls.buffer = '';
        controls.cursorPosition = 0;
    }
};

const enterActionHandle = (controls) => {
    process.stdout.write('\r\n');
    controls.commandLine = controls.buffer.trim().replace(/[\s\t]+/g, ' ');
    controls.buffer = '';
    controls.cursorPosition = 0;
    controls.typedCommands.push(controls.commandLine);
    controls.typedCommandsPointer = controls.typedCommands.length - 1;
};

const backSpaceActionHandle = (controls) => {
    controls.cursorPosition--;
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    let first = controls.buffer.substring(0, controls.cursorPosition);
    let second = controls.buffer.substring(controls.cursorPosition + 1);
    controls.buffer = first + second;
    process.stdout.write(controls.buffer);
    process.stdout.cursorTo(controls.cursorPosition);
};

const executeCommand = (controls, commands) => {
    const commandChunks = parse(controls.commandLine);
    const command = commandChunks[0];

    if (commands[command]) {
        commands[command].run(...commandChunks.slice(1));
    } else if ('help' === command) {
        let commandsList = [];
        for (let key in commands) {
            if (!commands.hasOwnProperty(key)) continue;
            if (commands[key].usage) {
                commandsList.push(` ${commands[key].usage} \r\n`);
            } else {
                commandsList.push(` Not declared help for command "${key}" in object key "usage"! \r\n`);
            }
        }
        console.log(`${FILENAME}: Available commands are: \r\n\r\n${commandsList.join('') }`);
    } else {
        console.error(`${FILENAME}: Command "${controls.commandLine}" not recognized! Use help command!`);
    }
    controls.commandLine = '';
};

const writeSymbolIntoStdout = (controls, key) => {
    // require('fs').writeFileSync('key.txt', toUnicode(key)); return false;
    if (/^[-\w\s\t'"\\/\[\]\.{},;<>|:?!@#%\^&\$*\(\)+=~`]+$/.test(key)) {
        if (controls.buffer.length !== controls.cursorPosition) {
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            let first = controls.buffer.substring(0, controls.cursorPosition );
            let second = controls.buffer.substring(controls.cursorPosition);
            controls.buffer = first + key + second;
            process.stdout.write(controls.buffer);
            controls.cursorPosition++;
            process.stdout.cursorTo(controls.cursorPosition);
        } else {
            controls.buffer = controls.buffer + key;
            controls.cursorPosition = controls.buffer.length;
            process.stdout.write(key);
        }
    }
};

let combineActionsForEnterHandle = (controls, commands) => {
    enterActionHandle(controls);
    executeCommand(controls, commands);
};

const toUnicode = (theString) => {
    var unicodeString = '';
    for (var i=0; i < theString.length; i++) {
        var theUnicode = theString.charCodeAt(i).toString(16).toUpperCase();
        while (theUnicode.length < 4) {
            theUnicode = '0' + theUnicode;
        }
        theUnicode = '\\u' + theUnicode;
        unicodeString += theUnicode;
    }
    return unicodeString;
};

const keyHandler = (commands, key) => {
    // console.log(toUnicode(key));
    if (consoleCommander.keys[key] && typeof consoleCommander.keys[key] === 'function') {
        consoleCommander.keys[key](controls, commands);
    } else {
        writeSymbolIntoStdout(controls, key);
    }
};


let consoleCommander = function() {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', (key) => {
        keyHandler(consoleCommander.commands, key);
    });
    console.log(`${FILENAME}: watching for commands! type help for list of commands!`);
};
consoleCommander.keys = {};


consoleCommander.keys['\u0003'] = doExit; // cntrl + c
consoleCommander.keys['\u0008'] = backSpaceActionHandle; // backspace
consoleCommander.keys['\u000D'] = combineActionsForEnterHandle; // enter
consoleCommander.keys['\u001B\u005B\u0041'] = upCursorActionHandle; // up
consoleCommander.keys['\u001B\u005B\u0042'] = downCursorActionHandle; // down
consoleCommander.keys['\u001B\u005B\u0044'] = leftCursorActionHandle; // left
consoleCommander.keys['\u001B\u005B\u0043'] = rightCursorActionHandle; // right

console.log(this);

module.exports = (commands) => {
    consoleCommander.commands = commands;
    return consoleCommander;
};
