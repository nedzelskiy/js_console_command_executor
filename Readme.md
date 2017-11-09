### Review:

This is a script that allows you wrote command and execute it while this script will be listening stdin!
You can add any handlers for any keys and any commands for run as written below. Enjoy!

### Usage:

First of all you need define your commands:

````javascript
const availableCommands = {
    'k': {
        run: function() {
            console.log('kill process!');
        }
    },
    'exit': {
        run: function() {
            console.log('exit process!');
        }
    }
};
````
Optionally you can add help for each commands:
````javascript
availableCommands.k.usage =     'k [PID, [SIGNAL]]               kill process by its PID';
availableCommands.exit.usage =  'exit                            stop watching for commands and exit script';
````
require script:

````javascript
const execConsole = require('js_console_command_executor')(availableCommands);
````
Optionally you can add new key handler. Adding new handler for "Ctrl + q":
````javascript
execConsole.keys['\u0011'] = (controls, commands) => {
    console.log('This is handler for Cntrl + q! Another exit action!');
};
````
And this we're adding action move cursor left for two position for key "{" => "Shift + [":
````javascript
execConsole.keys['\u007B'] = (controls, commands) => {
    if (controls.cursorPosition > 1) {
        controls.cursorPosition = controls.cursorPosition - 2;
        process.stdout.cursorTo(controls.cursorPosition);
    }
};
````
Optionally you can rebind standard handler. Rebind logic for "combineActionsForEnterHandle":
````javascript
execConsole.actions.combineActionsForEnterHandle = function() {
    console.log("\r\n\r\nThis is a logger! From rebind standard handler \"combineActionsForEnterHandle\"!");
    this.enterActionHandle(execConsole.controls);
    this.executeCommand(execConsole.controls, execConsole.commands);
};
````

run script:
````javascript
execConsole();
````
and you can even add a new command after script run (optional)!
````javascript
execConsole.commands['n'] = {
    run: function() {
        console.log('I\'m a new command added after running script!');
    },
    usage: 'n                               just a new added command!'
};

````

Try use it! For more example run:
````bash
node ./example_runing.js
````