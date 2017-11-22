'use strict';

const fs = require('fs');
const path = require('path');
const terminate = require('terminate');
const parse = require('shell-quote').parse;
const IS_WINDOWS = /^win/.test(process.platform);
const FILENAME = `js-console-command-executor: pid[${ process.pid }]`;

const controls = {
    stdin: process.stdin,
    stdout: process.stdout,
    buffer: '',
    commandLine: '',
    cursorPosition: 0,
    typedCommands: [],
    typedCommandsPointer: -1
};

const actions = {
    doExit: function (controls, commands, key) {
        terminate(process.pid, 'SIGKILL', err => {
            if (err) {
                controls.stdout.write(`${FILENAME} ERROR: ` + "\r\n" + err + "\r\n");
            }
        });
    },
    moveCursorToRight: function (controls, commands, key) {
        if (controls.cursorPosition < controls.buffer.length) {
            controls.cursorPosition++;
            controls.stdout.cursorTo(controls.cursorPosition);
        }
    },
    moveCursorToLeft: function (controls, commands, key) {
        if (controls.cursorPosition > 0) {
            controls.cursorPosition--;
            controls.stdout.cursorTo(controls.cursorPosition);
        }
    },
    goUpToCommandsHistory: function (controls, commands, key) {
        if (controls.typedCommandsPointer >= 0) {
            controls.stdout.clearLine();  // clear current text
            controls.stdout.cursorTo(0);
            controls.stdout.write(controls.typedCommands[controls.typedCommandsPointer]);
            controls.buffer = controls.typedCommands[controls.typedCommandsPointer];
            controls.typedCommandsPointer--;
            controls.cursorPosition = controls.buffer.length;
        } else {
            actions.clearStdOut(controls, commands, key);
        }
    },
    goDownToCommandsHistory: function (controls, commands, key) {
        if (controls.typedCommandsPointer < controls.typedCommands.length - 1) {
            controls.typedCommandsPointer++;
            controls.stdout.clearLine();
            controls.stdout.cursorTo(0);
            controls.stdout.write(controls.typedCommands[controls.typedCommandsPointer]);
            controls.buffer = controls.typedCommands[controls.typedCommandsPointer];
            controls.cursorPosition = controls.buffer.length;
        } else {
            actions.clearStdOut(controls, commands, key);
        }
    },
    handleEnterKeyAction: function (controls, commands, key) {
        controls.stdout.write('\r\n');
        controls.commandLine = controls.buffer.trim().replace(/[\s\t]+/g, ' ');
        controls.buffer = '';
        controls.cursorPosition = 0;
        controls.typedCommands.push(controls.commandLine);
        controls.typedCommandsPointer = controls.typedCommands.length - 1;
    },
    handleBackSpaceKeyAction: function (controls, commands, key) {
        if (controls.cursorPosition < 1) {
            controls.cursorPosition = 0;
            return;
        }
        controls.cursorPosition--;
        controls.stdout.clearLine();
        controls.stdout.cursorTo(0);
        let first = controls.buffer.substring(0, controls.cursorPosition);
        let second = controls.buffer.substring(controls.cursorPosition + 1);
        controls.buffer = first + second;
        controls.stdout.write(controls.buffer);
        controls.stdout.cursorTo(controls.cursorPosition);
    },
    handleHelpCommand: function(controls, commands, key) {
        let commandsList = [];
        let maxLongString = 0;
        for (let key in commands) {
            if (commands[key].usage) {
                let strLine = commands[key].usage.split("<>");
                if (strLine[0].length > maxLongString) {
                    maxLongString = strLine[0].length;
                }
            }
        }
        for (let key in commands) {
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
        controls.stdout.write(`${FILENAME}: Available commands are: \r\n\r\n${commandsList.join('') }` + "\r\n");
    },
    executeCommand: function (controls, commands, key) {
        const commandChunks = parse(controls.commandLine);
        const command = commandChunks[0];

        if (commands[command]) {
            commands[command].run.apply(this, commandChunks.slice(1));
        } else if ('help' === command) {
            actions.handleHelpCommand(controls, commands);
        } else {
            controls.stdout.write(`${FILENAME}: Command "${controls.commandLine}" not recognized! Use help command!` + "\r\n");
        }
        controls.commandLine = '';
    },
    testKeyForAvailableToStdout: function (key) {
        // require('fs').writeFileSync('key.txt', actions.toUnicode(key));
        return (
            /^[-\w'"\\/\[\]\.{},;<>|:?!@#%\^&\$*\(\)+=~`]+$/.test(key)
            || '\u0020' === key // space
        );
    },
    writeSymbolToStdout: function (controls, commands, key) {
        if (actions.testKeyForAvailableToStdout(key)) {
            if (controls.buffer.length !== controls.cursorPosition) {
                controls.stdout.clearLine();
                controls.stdout.cursorTo(0);
                let first = controls.buffer.substring(0, controls.cursorPosition );
                let second = controls.buffer.substring(controls.cursorPosition);
                controls.buffer = first + key + second;
                controls.stdout.write(controls.buffer);
                controls.cursorPosition++;
                controls.stdout.cursorTo(controls.cursorPosition);
            } else {
                controls.buffer = controls.buffer + key;
                controls.cursorPosition = controls.buffer.length;
                controls.stdout.write(key);
            }
        }
    },
    handleCombineActionsForEnterKeyAction: function(controls, commands, key) {
        actions.handleEnterKeyAction(controls, commands, key);
        actions.executeCommand(controls, commands, key);
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
            keys[key](controls, commands, key);
        } else {
            actions.writeSymbolToStdout(controls, commands, key);
        }
    },
    clearStdOut: function(controls, commands, key) {
        controls.stdout.clearLine();
        controls.stdout.cursorTo(0);
        controls.buffer = '';
        controls.cursorPosition = 0;
    },
    searchFolderByStdin: function(controls, commands, key) {
        // if last buffer symbol isn't space or tab
        if (/[\s\t]+/.test(controls.buffer[controls.buffer.length - 1])) {
            return;
        }
        let matched = []
            ,parsedBuffer = parse(controls.buffer)
            ;
        if (parsedBuffer.length < 1) return;

        let folders = parsedBuffer.pop().split('/');

        if (folders[folders.length - 1] === '') { // do list of all folders in way
            let foldersWay = folders[0];

            for (let i = 1; i < folders.length - 1; i++) {
                foldersWay = foldersWay + `/${folders[i]}`;
            }

            let way = path.normalize(`${process.env.pwd}/${foldersWay}`);

            if (!fs.existsSync(way)) return;

            actions.putInfoInStdOut( fs.readdirSync(way).join(' '));
            controls.stdout.write(controls.buffer);
            controls.cursorPosition = controls.buffer.length;
        } else {
            let folderName = folders[folders.length - 1]
                ,foldersWay = ''
                ;

            for (let i = 0; i < folders.length - 1; i++) {
                foldersWay = foldersWay + `/${folders[i]}`;
            }
            let way = path.normalize(`${process.env.pwd}/${foldersWay}`);

            if (!fs.existsSync(way)) return;

            const folderContent = fs.readdirSync(way);
            folderContent.forEach(name => {
                let regex = new RegExp(`^${folderName}`, "i");
                if (regex.test(name)) {
                    if (fs.lstatSync(`${process.env.pwd}/${foldersWay}/${name}`).isDirectory()) {
                        matched.push(`${name}/`);
                    } else {
                        matched.push(name);
                    }
                }
            });
            if (matched.length < 1) return;
            if (matched.length === 1) {
                controls.buffer = controls.buffer.replace(new RegExp(`${folderName}$`, "i") , matched[0]);
                controls.cursorPosition = controls.buffer.length;
                controls.stdout.clearLine();
                controls.stdout.cursorTo(0);
                controls.stdout.write(controls.buffer);
            } else {
                actions.putInfoInStdOut(matched.join(' '));
                controls.stdout.write(controls.buffer);
                controls.cursorPosition = controls.buffer.length;
            }
        }
    },
    putInfoInStdOut: function(str) {
        let stdoutLine = `\r\n${str}\r\n\r\n`;
        controls.stdout.clearLine();
        controls.stdout.cursorTo(0);
        controls.stdout.write(stdoutLine);
        return stdoutLine;
    }
};



let execConsole = function() {
    controls.stdin.setRawMode(true);
    controls.stdin.resume();
    controls.stdin.setEncoding('utf8');
    controls.stdin.on('data', (key) => {
        actions.keyHandler(key, execConsole.keys, execConsole.commands, execConsole.controls);
    });
    controls.stdout.write(`${FILENAME}: watching for commands! type help for list of commands!` + "\r\n");
};
execConsole.keys = {};
execConsole.commands = {};
execConsole.actions = actions;
execConsole.controls = controls;


execConsole.keys['\u0003'] = (controls, commands, key) => actions.doExit(controls, commands, key); // Ctrl + C
execConsole.keys['\u001B'] = (controls, commands, key) => actions.clearStdOut(controls, commands, key); // Esc
if (IS_WINDOWS) {
    execConsole.keys['\u0008'] = (controls, commands, key) => actions.handleBackSpaceKeyAction(controls, commands, key); // backspace
} else {
    execConsole.keys['\u007F'] = (controls, commands, key) => actions.handleBackSpaceKeyAction(controls, commands, key); // backspace
}
execConsole.keys['\u0009'] = (controls, commands, key) => actions.searchFolderByStdin(controls, commands,key); // tab
execConsole.keys['\u000D'] = (controls, commands, key) => actions.handleCombineActionsForEnterKeyAction(controls, commands, key); // enter
execConsole.keys['\u001B\u005B\u0041'] = (controls, commands, key) => actions.goUpToCommandsHistory(controls, commands, key); // up
execConsole.keys['\u001B\u005B\u0042'] = (controls, commands, key) => actions.goDownToCommandsHistory(controls, commands, key); // down
execConsole.keys['\u001B\u005B\u0044'] = (controls, commands, key) => actions.moveCursorToLeft(controls, commands, key); // left
execConsole.keys['\u001B\u005B\u0043'] = (controls, commands, key) => actions.moveCursorToRight(controls, commands,key); // right

module.exports = (commands) => {
    let isExistCommand = false;
    for (let command in commands) {
        isExistCommand = true;
    }
    if (!isExistCommand) {
        console.log(`${FILENAME}: Object of given commands is empty!`); actions.doExit(); return {};
    } else {
        execConsole.commands = commands;
        return execConsole;
    }
};
