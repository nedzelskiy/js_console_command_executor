'use strict';

const terminate = require('terminate');

const availableCommands = {
    'k': {
        run: function(pid) {
            if (!pid || !/^\d+$/.test(pid)) {
                console.error(`Wrong argument pid for command k - kill`);
                return false;
            }
            let signal = 'SIGKILL';
            if (arguments[1] &&  /^[a-zA-Z]+$/.test(pid)) {
                signal = arguments[1];
            }
            terminate(pid, signal, err => {
                if (err) {
                    console.error(err);
                } else {
                    console.log(`Command KILL for process "${ pid }" executed with signal [${ signal }]!`);
                }
            });
        }
    },
    'exit': {
        run: function() {
            const signal = 'SIGINT';
            console.log(`Command EXIT for process "${ process.pid }" will be executed with signal [${ signal }]!`);
            terminate(process.pid, 'SIGINT', err => {
                if (err) {
                    console.error(err);
                } 
            });
        }
    }
};

// adding help for each commands, symbol "<>" needed as separator between command and text explanation (for pretty input)
availableCommands.k.usage =     'k [PID, [SIGNAL]] <> kill process by its PID';
availableCommands.exit.usage =  'exit <> stop watching for commands and exit script';

const execConsole = require('./index')(availableCommands);

// adding new key "Cntr + q"
execConsole.keys['\u0011'] = (controls, commands) => {
    console.log('This is handler for Cntrl + q! Another exit action!');
};
// adding move cursor left for two position key "{"
execConsole.keys['\u007B'] = (controls, commands) => {
    if (controls.cursorPosition > 1) {
        controls.cursorPosition = controls.cursorPosition - 2;
        execConsole.controls.stdout.cursorTo(controls.cursorPosition);
    }
};

// rebind standard handler "handleCombineActionsForEnterKeyAction"
const savedAction = execConsole.actions.handleCombineActionsForEnterKeyAction;
execConsole.actions.handleCombineActionsForEnterKeyAction = function() {
    console.log(`\r\n\r\nThis is a logger! From rebind standard handler "handleCombineActionsForEnterKeyAction"!`);
    savedAction(execConsole.controls, execConsole.commands);
};

// run script
execConsole();

// and even add a new command after script run!
execConsole.commands['n'] = {
    run: function() {
        console.log('I\'m a new command added after running script!');
    },
    usage: 'n <> just a new added command!'
};
console.log(`
This is a demo!
Available commands:
- help
- k
- exit

You can use "tab" for autocomplete name folders and files, "backspace", move cursor position by
arrow keys "left" and "right", view history of typed commands by using arrow keys "up" and "down"
and much more...

Let's go! Type command!

`);