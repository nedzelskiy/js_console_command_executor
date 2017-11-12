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
    doExit: function (controls, commands) {
        terminate(process.pid, 'SIGKILL', err => {
            if (err) {
                console.error(`${FILENAME} ERROR: `, err);
            } else {
                process.exit();
            }
        });
    },
    moveCursorToRight: function (controls, commands) {
        if (controls.cursorPosition < controls.buffer.length) {
            controls.cursorPosition++;
            process.stdout.cursorTo(controls.cursorPosition);
        }
    },
    moveCursorToLeft: function (controls, commands) {
        if (controls.cursorPosition > 0) {
            controls.cursorPosition--;
            process.stdout.cursorTo(controls.cursorPosition);
        }
    },
    goUpToCommandsHistory: function (controls, commands) {
        if (controls.typedCommandsPointer >= 0) {
            process.stdout.clearLine();  // clear current text
            process.stdout.cursorTo(0);
            process.stdout.write(controls.typedCommands[controls.typedCommandsPointer]);
            controls.buffer = controls.typedCommands[controls.typedCommandsPointer];
            controls.typedCommandsPointer--;
            controls.cursorPosition = controls.buffer.length;
        } else {
            actions.clearStdOut(controls, commands);
        }
    },
    goDownToCommandsHistory: function (controls, commands) {
        if (controls.typedCommandsPointer < controls.typedCommands.length - 1) {
            controls.typedCommandsPointer++;
            process.stdout.clearLine();  // clear current text
            process.stdout.cursorTo(0);
            process.stdout.write(controls.typedCommands[controls.typedCommandsPointer]);
            controls.buffer = controls.typedCommands[controls.typedCommandsPointer];
            controls.cursorPosition = controls.buffer.length;
        } else {
            actions.clearStdOut(controls, commands);
        }
    },
    handleEnterKeyAction: function (controls) {
        process.stdout.write('\r\n');
        controls.commandLine = controls.buffer.trim().replace(/[\s\t]+/g, ' ');
        controls.buffer = '';
        controls.cursorPosition = 0;
        controls.typedCommands.push(controls.commandLine);
        controls.typedCommandsPointer = controls.typedCommands.length - 1;
    },
    handleBackSpaceKeyAction: function (controls, commands) {
        controls.cursorPosition--;
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        let first = controls.buffer.substring(0, controls.cursorPosition);
        let second = controls.buffer.substring(controls.cursorPosition + 1);
        controls.buffer = first + second;
        process.stdout.write(controls.buffer);
        process.stdout.cursorTo(controls.cursorPosition);
    },
    handleHelpCommand: function(controls, commands) {
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
    },
    executeCommand: function (controls, commands) {
        const commandChunks = parse(controls.commandLine);
        const command = commandChunks[0];

        if (commands[command]) {
            commands[command].run(...commandChunks.slice(1));
        } else if ('help' === command) {
            actions.handleHelpCommand(controls, commands);
        } else {
            console.error(`${FILENAME}: Command "${controls.commandLine}" not recognized! Use help command!`);
        }
        controls.commandLine = '';
    },
    testKeyForAvailableToStdout: function (key) {
        // require('fs').writeFileSync('key.txt', actions.toUnicode(key)); return false;
        return /^[-\w\s'"\\/\[\]\.{},;<>|:?!@#%\^&\$*\(\)+=~`]+$/.test(key);
    },
    writeSymbolToStdout: function (controls, key) {
        if (actions.testKeyForAvailableToStdout(key)) {
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
    handleCombineActionsForEnterKeyAction: function(controls, commands) {
        actions.handleEnterKeyAction(controls);
        actions.executeCommand(controls, commands);
    },
    toUnicode: function (theString) {
        let unicodeString = '';
        for (let i = 0; i < theString.length; i++) {
            let theUnicode = theString.charCodeAt(i).toString(16).toUpperCase();
            while (theUnicode.length < 4) {
                theUnicode = '0' + theUnicode;
            }
            theUnicode = '\\u' + theUnicode;
            unicodeString += theUnicode;
        }
        return unicodeString;
    },
    keyHandler: function (key, keys, commands, controls) {
        // console.log(actions.toUnicode(key));
        if (keys[key] && typeof keys[key] === 'function') {
            keys[key](controls, commands);
        } else {
            actions.writeSymbolToStdout(controls, key);
        }
    },
    clearStdOut: function(controls, commands) {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        controls.buffer = '';
        controls.cursorPosition = 0;
    }
};



let execConsole = function() {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', (key) => {
        actions.keyHandler(key, execConsole.keys, execConsole.commands, execConsole.controls);
    });
    console.log(`${FILENAME}: watching for commands! type help for list of commands!`);
};
execConsole.keys = {};
execConsole.commands = {};
execConsole.actions = actions;
execConsole.controls = controls;


execConsole.keys['\u0003'] = (controls, commands) => actions.doExit(controls, commands); // Ctrl + C
execConsole.keys['\u001B'] = (controls, commands) => actions.clearStdOut(controls, commands); // Esc
execConsole.keys['\u007F'] = (controls, commands) => actions.handleBackSpaceKeyAction(controls); // backspace
execConsole.keys['\u000D'] = (controls, commands) => actions.handleCombineActionsForEnterKeyAction(controls, commands); // enter
execConsole.keys['\u001B\u005B\u0041'] = (controls, commands) => actions.goUpToCommandsHistory(controls); // up
execConsole.keys['\u001B\u005B\u0042'] = (controls, commands) => actions.goDownToCommandsHistory(controls); // down
execConsole.keys['\u001B\u005B\u0044'] = (controls, commands) => actions.moveCursorToLeft(controls); // left
execConsole.keys['\u001B\u005B\u0043'] = (controls, commands) => actions.moveCursorToRight(controls); // right

module.exports = (commands) => {
    execConsole.commands = commands;
    return execConsole;
};
