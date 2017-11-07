'use strict';

const stdin = process.stdin;
const terminate = require('terminate');
const parse = require('shell-quote').parse;
const FILENAME = `js-console-command-executor: pid[${ process.pid }]`;

let buffer = '';
let typedCommands = [];
let typedCommandsPointer = -1;

const keyHandler = (commands, key) => {
    if (key == '\u001B\u005B\u0041') { // up
        if (typedCommandsPointer > 0) {
            typedCommandsPointer--;
            process.stdout.clearLine();  // clear current text
            process.stdout.cursorTo(0);
            process.stdout.write(typedCommands[typedCommandsPointer]);
            buffer = typedCommands[typedCommandsPointer];
        } else {
            process.stdout.clearLine();  // clear current text
            process.stdout.cursorTo(0);
        }
    } else if (key == '\u001B\u005B\u0043') { // right
    } else if (key == '\u001B\u005B\u0042') { // down
        if (typedCommandsPointer >= typedCommands.length - 1) {
            process.stdout.clearLine();  // clear current text
            process.stdout.cursorTo(0);
        } else {
            typedCommandsPointer++;
            process.stdout.clearLine();  // clear current text
            process.stdout.cursorTo(0);
            process.stdout.write(typedCommands[typedCommandsPointer]);
            buffer = typedCommands[typedCommandsPointer];
        }
    } else if (key == '\u001B\u005B\u0044') { // left
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
        typedCommands.push(commandLine);
        typedCommandsPointer = typedCommands.length;
        const commandChunks = parse(commandLine);
        const command = commandChunks[0];

        if (commands[command]) {
            commands[command].run(...commandChunks.slice(1));
        } else if ('help' === command) {
            let commandsList = [];
            for (let key in commands) {
                if (!commands.hasOwnProperty(key)) continue;
                commandsList.push(` ${commands[key].usage} \r\n`);
            }
            console.log(`${FILENAME}: Available commands are: \r\n${commandsList.join('') }`);
        } else {
            console.error(`${FILENAME}: Command not recognized! Use help command!`);
        }
    } else {
        process.stdout.write(key);
        buffer = buffer + key;
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
