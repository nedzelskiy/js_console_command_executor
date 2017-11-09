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
    doExit: function () {
        terminate(process.pid, 'SIGKILL', err => {
            if (err) {
                console.error(`${FILENAME} ERROR: `, err);
            } else {
                process.exit();
            }
        });
    },
    rightCursorActionHandle: function (controls) {
        if (controls.cursorPosition < controls.buffer.length) {
            controls.cursorPosition++;
            process.stdout.cursorTo(controls.cursorPosition);
        }
    },
    leftCursorActionHandle: function (controls) {
        if (controls.cursorPosition > 0) {
            controls.cursorPosition--;
            process.stdout.cursorTo(controls.cursorPosition);
        }
    },
    upCursorActionHandle: function (controls) {
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
    },
    downCursorActionHandle: function (controls) {
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
    },
    enterActionHandle: function (controls) {
        process.stdout.write('\r\n');
        controls.commandLine = controls.buffer.trim().replace(/[\s\t]+/g, ' ');
        controls.buffer = '';
        controls.cursorPosition = 0;
        controls.typedCommands.push(controls.commandLine);
        controls.typedCommandsPointer = controls.typedCommands.length - 1;
    },
    backSpaceActionHandle: function (controls) {
        controls.cursorPosition--;
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        let first = controls.buffer.substring(0, controls.cursorPosition);
        let second = controls.buffer.substring(controls.cursorPosition + 1);
        controls.buffer = first + second;
        process.stdout.write(controls.buffer);
        process.stdout.cursorTo(controls.cursorPosition);
    },
    executeCommand: function (controls, commands) {
        const commandChunks = parse(controls.commandLine);
        const command = commandChunks[0];

        if (commands[command]) {
            commands[command].run(...commandChunks.slice(1));
        } else if ('help' === command) {
            let commandsList = [];
            let maxLongString = 0;
            for (let key in commands) {
                if (!commands.hasOwnProperty(key)) continue;
                let strLine = commands[key].usage.split("<>");
                if (strLine[0].length > maxLongString) {
                    maxLongString = strLine[0].length;
                }
            }
            for (let key in commands) {
                if (!commands.hasOwnProperty(key)) continue;
                if (commands[key].usage) {
                    let strLine = commands[key].usage.split('<>');
                    let textLine = strLine[0] + ' '.repeat(maxLongString - strLine[0].length) + ' '.repeat(3);
                    if (strLine[1] && '' !== strLine[1]) {
                        textLine = textLine + strLine[1];
                    }
                    commandsList.push(` ${textLine} \r\n`);
                } else {
                    commandsList.push(` Not declared help for command "${key}" in object key "usage"! \r\n`);
                }
            }
            console.log(`${FILENAME}: Available commands are: \r\n\r\n${commandsList.join('') }`);
        } else {
            console.error(`${FILENAME}: Command "${controls.commandLine}" not recognized! Use help command!`);
        }
        controls.commandLine = '';
    },
    testKeyForAvailableToStdout: function (key) {
        // require('fs').writeFileSync('key.txt', actions.toUnicode(key)); return false;
        return /^[-\w\s'"\\/\[\]\.{},;<>|:?!@#%\^&\$*\(\)+=~`]+$/.test(key);
    },
    writeSymbolIntoStdout: function (controls, key) {
        if (actions.testKeyForAvailableToStdout()) {
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
    },
    combineActionsForEnterHandle: function(controls, commands) {
        actions.enterActionHandle(controls);
        actions.executeCommand(controls, commands);
    },
    toUnicode: function (theString) {
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
    },
    keyHandler: function (commands, key) {
        // console.log(toUnicode(key));
        if (consoleCommander.keys[key] && typeof consoleCommander.keys[key] === 'function') {
            consoleCommander.keys[key](controls, commands);
        } else {
            actions.writeSymbolIntoStdout(controls, key);
        }
    }
};



let consoleCommander = function() {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', (key) => {
        actions.keyHandler(consoleCommander.commands, key);
    });
    console.log(`${FILENAME}: watching for commands! type help for list of commands!`);
};
consoleCommander.keys = {};
consoleCommander.commands = {};
consoleCommander.actions = actions;
consoleCommander.controls = controls;


consoleCommander.keys['\u0003'] = () => actions.doExit(); // Ctrl + C
consoleCommander.keys['\u0008'] = (controls) => actions.backSpaceActionHandle(controls); // backspace
consoleCommander.keys['\u000D'] = (controls) => actions.combineActionsForEnterHandle(controls); // enter
consoleCommander.keys['\u001B\u005B\u0041'] = (controls) => actions.upCursorActionHandle(controls); // up
consoleCommander.keys['\u001B\u005B\u0042'] = (controls) => actions.downCursorActionHandle(controls); // down
consoleCommander.keys['\u001B\u005B\u0044'] = (controls) => actions.leftCursorActionHandle(controls); // left
consoleCommander.keys['\u001B\u005B\u0043'] = (controls) => actions.rightCursorActionHandle(controls); // right

module.exports = (commands) => {
    consoleCommander.commands = commands;
    return consoleCommander;
};
