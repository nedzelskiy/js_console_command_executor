[![Travis Build Status](https://api.travis-ci.org/nedzelskiy/js_console_command_executor.svg?branch=master)](https://travis-ci.org/nedzelskiy/js_console_command_executor)

### Review:

This is a script that allows you wrote command and execute it while this script will be listening stdin!
You can add any handlers for any keys and any commands for run as written below.
In js console you can use "tab" for auto complete names folders and files, "backspace",
move cursor position by arrow keys "left" and "right", view history of typed commands
by using arrow keys "up" and "down" and much more...
Enjoy!

Run demo with:

````bash
npm run demo
````

### Why?

Exists situations, especially in development, when you need send to running process some control commands,
for example for restart build task (like "rs" in nodemon https://www.npmjs.com/package/nodemon) or something good else.
What exactly? You can add every command that you want!

### Requirements:
* Node 4+
* Npm 2+

### Install:

````bash
npm i --save-dev js_console_command_executor
````

### Usage:

First of all you need define your commands:

````javascript
const availableCommands = {
    'k': {
        run: function(pid, signal) {
            console.log(`kill process! ${ pid } with signal "${ signal }"`);
            // some logic
        }
    },
    'exit': {
        run: function() {
            console.log(`exit process! ${ process.pid }`);
            // some logic
        }
    }
};
````
Add help for each commands, symbol "<>" needed as separator between command and text explanation (for pretty input):
````javascript
availableCommands.k.usage = 'k [PID, [SIGNAL]] <> kill process by its PID';
availableCommands.exit.usage = 'exit <> stop watching for commands and exit script';
````

require script:

````javascript
const execConsole = require('js_console_command_executor')(availableCommands);
````
**Now you can access for this objects:**
````javascript
* execConsole.keys      // objects with defined keys and handlers;
* execConsole.actions   // object with all standard functions such as executeCommand and etc;
* execConsole.commands  // your object with commands;
* execConsole.controls  // object with state of line buffer, cursor position etc;
````
Optionally you can add new key handler. Adding new handler for "Ctrl + q":
````javascript
execConsole.keys['\u0011'] = (controls, commands) => {
    console.log('This is handler for Ctrl + q! Another exit action!');
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
Optionally you can rebind standard handler. Rebind logic for "handleCombineActionsForEnterKeyAction":
````javascript
execConsole.actions.handleCombineActionsForEnterKeyAction = function() {
    console.log(`\r\n\r\nThis is a logger! From rebind standard handler "handleCombineActionsForEnterKeyAction"!`);
    execConsole.actions.handleEnterKeyAction(execConsole.controls);
    execConsole.actions.executeCommand(execConsole.controls, execConsole.commands);
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
    usage: 'n <> just a new added command!'
};

````

Try use it! 

For demo run:
````bash
npm run demo
````
For tests run:
````bash
npm run test
````
For code coverage run:
````bash
npm run coverage
````