'use strict';

const stdin = process.stdin;
const path = require('path');
const ps = require('ps-node');
const terminate = require('terminate');
const parse = require('shell-quote').parse;
const exec = require('child_process').exec;
const FILENAME = path.basename(__filename).replace(path.extname(path.basename(__filename)), '');

let buffer = '';
let typedCommands = [];
let typedCommandsPointer = -1;

stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');

stdin.on('data', function(key){
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
    } else if (key == '\u0003') {
        process.exit();
    } else if (key == '\u000D') { // enter
        process.stdout.write('\r\n');
        const commandLine = buffer;
        buffer = '';
        typedCommands.push(commandLine);
        typedCommandsPointer = typedCommands.length;
        const commandChunks = parse(commandLine);
        const command = commandChunks[0];
        switch (command) {
            case availableCommands.kill.name:
                if (commandChunks.length > 1 && /^\d+$/.test(commandChunks[1])) {
                    killProcessWithChild(commandChunks[1])
                        .then(() => {
                            console.log(`${FILENAME}: Command ${commandLine} was executed successful!`);
                        })
                        .catch(err => {
                            console.error(`${FILENAME} ERROR: ${err}`);
                        });
                } else {
                    console.error(`${FILENAME}: Wrong argument for command ${command}`)
                }
                break;
            case availableCommands.help.name:
                let commandsList = [];
                for (let key in availableCommands) {
                    if (!availableCommands.hasOwnProperty(key)) continue;
                    commandsList.push(` - ${availableCommands[key].usage} \r\n`);
                }
                console.log(`${FILENAME}: Available commands are: \r\n${commandsList.join('') }`);
                break;
            case availableCommands.restart.name:
                if (commandChunks.length > 1 && /^\d+$/.test(commandChunks[1])) {
                    let envStr = '';
                    if (commandChunks[2]) {
                        envStr = commandChunks[2];
                    }
                    restartProcessByPid(commandChunks[1], commandLine, envStr);
                } else {
                    console.error(`${FILENAME}: Wrong argument for command ${command}`)
                }
                break;
            case availableCommands.exit.name:
                    process.exit(0);
                break;
            default:
                console.error(`${FILENAME}: Command not recognized! Use help command!`);

        }
    } else {
        process.stdout.write(key);
        buffer = buffer + key;
    }
});

const restartProcessByPid = (pid, commandLine, envStr) => {
    ps.lookup({ pid: pid }, (err, resultList) => {
        if (err) {
            console.error(`${FILENAME} ERROR: ${err}`);
        }
        const process = resultList[0];
        if( process ) {
            killProcessWithChild(pid)
                .then(() => {
                    exec(`"${envStr}" "${process.command}" , ${process.arguments}`, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`${FILENAME} ERROR: ${error}`);
                        } else {
                            console.log(stdout);
                        }
                    });
                })
                .catch(err => {
                    console.error(`${FILENAME} ERROR: ${err}`);
                });
        } else {
            console.log(`${FILENAME}: 'No such process found!'` );
        }
    });
};

const killProcessWithChild = (pid) => {
    return new Promise((resolve, reject) => {
        terminate(pid, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

const availableCommands = {
    'kill': {
        name: 'kill',
        usage: 'kill [PID]                      kill process by its PID'
    },
    'help': {
        name: 'help',
        usage: 'help                            show listing for available commands'
    },
    'restart': {
        name: 'restart',
        usage: 'restart [PID, ENV string?]     restart process by its PID with env string'
    },
    'exit': {
        name: 'exit',
        usage: 'exit                            stop watching for comands and exit script'
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

console.log(`${FILENAME}: watching for commands! type help for list of commands!`);
console.log(`${FILENAME}: PID [${process.pid}]`);

