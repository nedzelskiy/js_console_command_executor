'use strict';

const stdin = process.stdin;
const terminate = require('terminate');
const parse = require('shell-quote').parse;
const FILENAME = `js-console-command-executor: pid[${ process.pid }]`;

let buffer = '';
let cursorPosition = 0;
let typedCommands = [];
let typedCommandsPointer = -1;

const keyHandler = (commands, key) => {
    if (key == '\u001B\u005B\u0041') { // up
        if (typedCommandsPointer >= 0) {
            process.stdout.clearLine();  // clear current text
            process.stdout.cursorTo(0);
            process.stdout.write(typedCommands[typedCommandsPointer]);
            buffer = typedCommands[typedCommandsPointer];
            typedCommandsPointer--;
            cursorPosition = buffer.length;
        } else {
            process.stdout.clearLine();  // clear current text
            process.stdout.cursorTo(0);
            buffer = '';
            cursorPosition = 0;
        }
    } else if (key == '\u0008') { //backspace
        cursorPosition--;
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        let first = buffer.substring(0, cursorPosition);
        let second = buffer.substring(cursorPosition + 1);
        buffer = first + second;
        process.stdout.write(buffer);
        process.stdout.cursorTo(cursorPosition);
    } else if (key == '\u001B\u005B\u0042') { // down
        if (typedCommandsPointer < typedCommands.length - 1) {
            typedCommandsPointer++;
            process.stdout.clearLine();  // clear current text
            process.stdout.cursorTo(0);
            process.stdout.write(typedCommands[typedCommandsPointer]);
            buffer = typedCommands[typedCommandsPointer];
            cursorPosition = buffer.length;
        } else {
            process.stdout.clearLine();  // clear current text
            process.stdout.cursorTo(0);
            buffer = '';
            cursorPosition = 0;
        }
    } else if (key == '\u001B\u005B\u0044') { // left
        if (cursorPosition > 0) {
            cursorPosition--;
            process.stdout.cursorTo(cursorPosition);
        }
    } else if (key == '\u001B\u005B\u0043') { // right
        if (cursorPosition < buffer.length) {
            cursorPosition++;
            process.stdout.cursorTo(cursorPosition);
        }
    } else if (key == '\u0003') { // cntrl + c
        terminate(process.pid, 'SIGKILL', err => {
            if (err) {
                console.error(`${FILENAME} ERROR: `, err);
            } else {
                process.exit();
            }
        });
    } else if (key == '\u000D') { // enter
        process.stdout.write('\r\n');
        const commandLine = buffer;
        buffer = '';
        cursorPosition = 0;
        typedCommands.push(commandLine);
        typedCommandsPointer = typedCommands.length - 1;
        const commandChunks = parse(commandLine);
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
            console.log(`${FILENAME}: Available commands are: \r\n${commandsList.join('') }`);
        } else {
            console.error(`${FILENAME}: Command "${commandLine}" not recognized! Use help command!`);
        }
    } else {
        // require('fs').writeFileSync('key.txt', toUnicode(key)); return false;
        if (/^[-\w\s\t'"\\/\[\]\.{},;<>|:?!@#%\^&\$*\(\)+=~`]+$/.test(key)) {
            if (buffer.length !== cursorPosition) {
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                let first = buffer.substring(0, cursorPosition );
                let second = buffer.substring(cursorPosition);
                buffer = first + key + second;
                process.stdout.write(buffer);
                cursorPosition++;
                process.stdout.cursorTo(cursorPosition);
            } else {
                buffer = buffer + key;
                cursorPosition = buffer.length;
                process.stdout.write(key);
            }
        }
    }
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


module.exports = commands => () => {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', keyHandler.bind(this, commands));
    console.log(`${FILENAME}: watching for commands! type help for list of commands!`);
};
