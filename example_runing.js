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
                    console.log(`Command KILL ${pid} executed with signal [${signal}]!`);
                }
            });
        }
    },
    'exit': {
        run: function() {
            const signal = 'SIGTERM';
            console.log(`Command exit ${process.id} will be executed with signal [${signal}]!`);
            terminate(process.pid, 'SIGTERM', err => {
                if (err) {
                    console.error(err);
                } 
            });
        }
    }
};
availableCommands.k.usage =     'k [PID, [SIGNAL]]               kill process by its PID';
availableCommands.exit.usage =  'exit                            stop watching for comands and exit script';

const execConsole = require('./index')(availableCommands);
execConsole();

