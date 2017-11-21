'use strict';

const usageMsg = 'test abrf#4f%dkp!@$%^&&x asdasd223__3';
const availableCommands = {
    'test': {
        run: function() {

        },
        usage: usageMsg
    },
    'test3': {
        run: function() {},
        usage: 'test3 <> test3'
    }
};

const sinon = require('sinon');
const EventEmitter = require('events');
const chai = require('chai');
const IS_WINDOWS = /^win/.test(process.platform);
const expect = chai.expect;
const assert = chai.assert;
const execConsole = require('./index.js')(availableCommands);

let stdoutMock = {
    rawBuffer: '',
    buffer: '',
    write: function(data) {
        if (!!~data.indexOf('\r') || !!~data.indexOf('\n')) {
            this.buffer = '';
        } else {
            this.buffer = this.buffer + data;
        }
        this.rawBuffer = this.rawBuffer + data;
    },
    clearLine: function() {
        this.buffer = '';
    },
    cursorTo: function() {}
};

let stdinMock = new EventEmitter();

stdinMock.setRawMode = function() {
    stdinMock.setRawMode.callCount++;
    stdinMock.setRawMode.args.push(arguments);
};
stdinMock.setRawMode.callCount = 0;
stdinMock.setRawMode.args = [];

stdinMock.resume = function() {
    stdinMock.resume.callCount++;
    stdinMock.resume.args.push(arguments);
};
stdinMock.resume.callCount = 0;
stdinMock.resume.args = [];

stdinMock.setEncoding = function() {
    stdinMock.setEncoding.callCount++;
    stdinMock.setEncoding.args.push(arguments);
};
stdinMock.setEncoding.callCount = 0;
stdinMock.setEncoding.args = [];

execConsole.controls.stdout = stdoutMock;
execConsole.controls.stdin = stdinMock;

let doExit_SPY = sinon.spy(execConsole.actions, "doExit");
let clearStdOut_SPY = sinon.spy(execConsole.actions, "clearStdOut");
let moveCursorToLeft_SPY = sinon.spy(execConsole.actions, "moveCursorToLeft");
let handleHelpCommand_SPY = sinon.spy(execConsole.actions, "handleHelpCommand");
let moveCursorToRight_SPY = sinon.spy(execConsole.actions, "moveCursorToRight");
let writeSymbolToStdout_SPY = sinon.spy(execConsole.actions, "writeSymbolToStdout");
let goUpToCommandsHistory_SPY = sinon.spy(execConsole.actions, "goUpToCommandsHistory");
let goDownToCommandsHistory_SPY = sinon.spy(execConsole.actions, "goDownToCommandsHistory");
let handleBackSpaceKeyAction_SPY = sinon.spy(execConsole.actions, "handleBackSpaceKeyAction");
let handleCombineActionsForEnterKeyAction_SPY = sinon.spy(execConsole.actions, "handleCombineActionsForEnterKeyAction");

let startedTypedCommandsPointerPosition = execConsole.controls.typedCommandsPointer;

execConsole();

describe('JS console command executor', () => {

    beforeEach(() => {
        stdoutMock.buffer = '';
        execConsole.controls.buffer = '';
        execConsole.controls.commandLine = '';
        execConsole.controls.typedCommands = [];
        execConsole.controls.cursorPosition = '';
        execConsole.controls.typedCommandsPointer = startedTypedCommandsPointerPosition;

        doExit_SPY.reset();
        clearStdOut_SPY.reset();
        moveCursorToLeft_SPY.reset();
        handleHelpCommand_SPY.reset();
        moveCursorToRight_SPY.reset();
        writeSymbolToStdout_SPY.reset();
        goUpToCommandsHistory_SPY.reset();
        goDownToCommandsHistory_SPY.reset();
        handleBackSpaceKeyAction_SPY.reset();
        handleCombineActionsForEnterKeyAction_SPY.reset();
    });

    it('should have action for display info', next => {
        stdoutMock.rawBuffer = '';
        let str = 'test';
        execConsole.actions.putInfoInStdOut(str);
        expect(stdoutMock.rawBuffer).to.be.equal(`\r\n${str}\r\n\r\n`);
        next();
    });
    it('should handle tab as autocomplete for current folder or files', next => {
        execConsole.controls.buffer = 'node';
        stdoutMock.rawBuffer = '';
        stdinMock.emit('data', '\u0009'); // emulated tab key action
        expect(stdoutMock.rawBuffer).to.be.equal(`node_modules/`);

        execConsole.controls.buffer = 'example_run';
        stdoutMock.rawBuffer = '';
        stdinMock.emit('data', '\u0009'); // emulated tab key action
        expect(stdoutMock.rawBuffer).to.be.equal(`example_runing.js`);

        execConsole.controls.buffer = 'node_modules/jasmine/bin/';
        stdoutMock.rawBuffer = '';
        stdinMock.emit('data', '\u0009'); // emulated tab key action
        expect(stdoutMock.rawBuffer).to.be.equal('\r\njasmine.js\r\n\r\nnode_modules/jasmine/bin/');

        execConsole.controls.buffer = 'node_modules/jasmine/lib/';
        stdoutMock.rawBuffer = '';
        stdinMock.emit('data', '\u0009'); // emulated tab key action
        assert.isTrue(!!~stdoutMock.rawBuffer.indexOf('jasmine.js'));

        execConsole.controls.buffer = 'node_modules/s';
        stdoutMock.rawBuffer = '';
        stdinMock.emit('data', '\u0009'); // emulated tab key action
        assert.isTrue(!!~stdoutMock.rawBuffer.indexOf('shell-quote'));
        assert.isTrue(!!~stdoutMock.rawBuffer.indexOf('sinon'));

        stdinMock.emit('data', ' ');
        execConsole.controls.buffer = ' ';
        stdoutMock.rawBuffer = '';
        stdinMock.emit('data', '\u0009'); // emulated tab key action
        expect(stdoutMock.rawBuffer).to.be.equal('');

        execConsole.controls.buffer = '';
        stdoutMock.rawBuffer = '';
        stdinMock.emit('data', '\u0009'); // emulated tab key action
        expect(stdoutMock.rawBuffer).to.be.equal('');

        stdoutMock.clearLine();
        stdinMock.emit('data', 'rt/');
        execConsole.controls.buffer = 'rt/';
        stdinMock.emit('data', '\u0009'); // emulated tab key action
        expect(stdoutMock.buffer).to.be.equal('rt/');

        next();
    });
    it('should allows write to stdout space and keyboards chars with both register', next => {
        let testKey = execConsole.actions.testKeyForAvailableToStdout;
        for (let i = 32; i < 127; i++) {
            if (!testKey(String.fromCharCode(i))) {
                console.log(i, String.fromCharCode(i), 'allowed to stdout = false');
            }
            assert.isTrue(testKey(String.fromCharCode(i)));
        }
        next();
    });
    it('should deny write to stdout special symbols expect declared in object keys', next => {
        let testKey = execConsole.actions.testKeyForAvailableToStdout;
        for (let i = 0; i < 32; i++) {
            for (let key in execConsole.keys) {
                if (!execConsole.keys.hasOwnProperty(key)) continue;
                if (String.fromCharCode(i) === key) continue;
                if (testKey(String.fromCharCode(i))) {
                    console.log(i, String.fromCharCode(i), 'allowed to stdout = true');
                }
            }
            assert.isFalse(testKey(String.fromCharCode(i)));
        }
        next();
    });
    it('should right handle backspace key', next => {
        execConsole.controls.buffer = 'asdf';
        execConsole.controls.cursorPosition = 4;
        execConsole.actions.handleBackSpaceKeyAction(execConsole.controls, execConsole.commands);
        expect(execConsole.controls.cursorPosition).to.be.equal(3);

        execConsole.controls.buffer = 'asd23 fre   3211     e23';
        execConsole.controls.cursorPosition = 14;
        execConsole.actions.handleBackSpaceKeyAction(execConsole.controls, execConsole.commands);
        expect(execConsole.controls.buffer).to.be.equal('asd23 fre   311     e23');
        expect(execConsole.controls.cursorPosition).to.be.equal(13);

        handleBackSpaceKeyAction_SPY.reset();
        if (IS_WINDOWS) {
            stdinMock.emit('data', '\u0008'); // emulated backspace key action
        } else {
            stdinMock.emit('data', '\u007F'); // emulated backspace key action
        }
        expect(handleBackSpaceKeyAction_SPY.callCount).to.be.equal(1);
        // check if cursor position < 0
        execConsole.controls.buffer = '1234';
        execConsole.controls.cursorPosition = -1;
        execConsole.actions.handleBackSpaceKeyAction(execConsole.controls, execConsole.commands);
        expect(execConsole.controls.cursorPosition).to.be.equal(0);
        expect(execConsole.controls.buffer).to.be.equal('1234');
        // check if cursor position = 0
        execConsole.controls.buffer = '1234';
        execConsole.controls.cursorPosition = 0;
        execConsole.actions.handleBackSpaceKeyAction(execConsole.controls, execConsole.commands);
        expect(execConsole.controls.cursorPosition).to.be.equal(0);
        expect(execConsole.controls.buffer).to.be.equal('1234');
        next();
    });
    it('should step cursor left to one position after pressed left arrow', next => {
        stdinMock.emit('data', '1');
        stdinMock.emit('data', '2');
        stdinMock.emit('data', '3');
        stdinMock.emit('data', '4');
        expect(execConsole.controls.cursorPosition).to.be.equal(4);

        stdinMock.emit('data', '\u001B\u005B\u0044'); // emulate pressed left arrow
        expect(execConsole.controls.cursorPosition).to.be.equal(3);
        stdinMock.emit('data', '\u001B'); // emit esc  -> clearStdout()

        expect(execConsole.controls.cursorPosition).to.be.equal(0);
        stdinMock.emit('data', '\u001B\u005B\u0044'); // emulate pressed left arrow
        expect(execConsole.controls.cursorPosition).to.be.equal(0);

        expect(moveCursorToLeft_SPY.callCount).to.be.equal(2);
        expect(clearStdOut_SPY.callCount).to.be.equal(1);
        next();
    });
    it('should step cursor right to one position after pressed right arrow', next => {
        execConsole.controls.buffer = '1234';
        execConsole.controls.cursorPosition = 1;
        execConsole.actions.moveCursorToRight(execConsole.controls, execConsole.commands);
        expect(execConsole.controls.cursorPosition).to.be.equal(2);
        execConsole.controls.cursorPosition = execConsole.controls.buffer.length;
        execConsole.actions.moveCursorToRight(execConsole.controls, execConsole.commands);
        expect(execConsole.controls.cursorPosition).to.be.equal(execConsole.controls.buffer.length);

        moveCursorToRight_SPY.reset();
        stdinMock.emit('data', '\u001B\u005B\u0043'); // emulated right arrow key action
        expect(moveCursorToRight_SPY.callCount).to.be.equal(1);
        next();
    });
    it('should shows previous command after pressed up arrow', next => {
        let pointerCommandsPosition = startedTypedCommandsPointerPosition;
        expect(execConsole.controls.typedCommandsPointer).to.be.equal(pointerCommandsPosition);

        stdinMock.emit('data', 'first');
        stdinMock.emit('data', '\u000D'); // emulate pressed enter
        pointerCommandsPosition++;
        expect(execConsole.controls.typedCommandsPointer).to.be.equal(pointerCommandsPosition);

        stdinMock.emit('data', 'second');
        stdinMock.emit('data', '\u000D'); // emulate pressed enter
        pointerCommandsPosition++;
        expect(execConsole.controls.typedCommandsPointer).to.be.equal(pointerCommandsPosition);


        assert.isTrue(writeSymbolToStdout_SPY.calledTwice);
        assert.isTrue(handleCombineActionsForEnterKeyAction_SPY.calledTwice);
        expect(stdoutMock.buffer).to.be.equal('');

        stdinMock.emit('data', '\u001B\u005B\u0041'); // emulate pressed up arrow
        expect(stdoutMock.buffer).to.be.equal('second');
        pointerCommandsPosition--;
        expect(execConsole.controls.typedCommandsPointer).to.be.equal(pointerCommandsPosition);


        stdinMock.emit('data', '\u001B\u005B\u0041'); // emulate pressed up arrow
        expect(stdoutMock.buffer).to.be.equal('first');
        pointerCommandsPosition--;
        expect(execConsole.controls.typedCommandsPointer).to.be.equal(pointerCommandsPosition);


        stdinMock.emit('data', '\u001B\u005B\u0041'); // emulate pressed up arrow
        expect(stdoutMock.buffer).to.be.equal('');
        expect(execConsole.controls.typedCommandsPointer).to.be.equal(pointerCommandsPosition);


        assert.isTrue(goUpToCommandsHistory_SPY.calledThrice);
        next();
    });
    it('should shows next given command after pressed down arrow', next => {
        let pointerCommandsPosition = startedTypedCommandsPointerPosition;
        expect(execConsole.controls.typedCommandsPointer).to.be.equal(pointerCommandsPosition);

        stdinMock.emit('data', 'first');
        stdinMock.emit('data', '\u000D'); // emulate pressed enter
        pointerCommandsPosition++;
        expect(execConsole.controls.typedCommandsPointer).to.be.equal(pointerCommandsPosition);


        stdinMock.emit('data', 'second');
        stdinMock.emit('data', '\u000D'); // emulate pressed enter
        pointerCommandsPosition++;
        expect(execConsole.controls.typedCommandsPointer).to.be.equal(pointerCommandsPosition);

        assert.isTrue(writeSymbolToStdout_SPY.calledTwice);
        assert.isTrue(handleCombineActionsForEnterKeyAction_SPY.calledTwice);
        expect(stdoutMock.buffer).to.be.equal('');

        stdinMock.emit('data', '\u001B\u005B\u0041'); // emulate pressed up arrow
        expect(stdoutMock.buffer).to.be.equal('second');
        pointerCommandsPosition--;
        expect(execConsole.controls.typedCommandsPointer).to.be.equal(pointerCommandsPosition);


        stdinMock.emit('data', '\u001B\u005B\u0041'); // emulate pressed up arrow
        expect(stdoutMock.buffer).to.be.equal('first');
        pointerCommandsPosition--;
        expect(execConsole.controls.typedCommandsPointer).to.be.equal(pointerCommandsPosition);


        stdinMock.emit('data', '\u001B\u005B\u0041'); // emulate pressed up arrow
        expect(stdoutMock.buffer).to.be.equal('');
        expect(execConsole.controls.typedCommandsPointer).to.be.equal(pointerCommandsPosition);


        stdinMock.emit('data', '\u001B\u005B\u0041'); // emulate pressed up arrow
        expect(stdoutMock.buffer).to.be.equal('');
        expect(execConsole.controls.typedCommandsPointer).to.be.equal(pointerCommandsPosition);


        stdinMock.emit('data', '\u001B\u005B\u0042'); // emulate pressed down arrow
        expect(stdoutMock.buffer).to.be.equal('first');
        pointerCommandsPosition++;
        expect(execConsole.controls.typedCommandsPointer).to.be.equal(pointerCommandsPosition);


        stdinMock.emit('data', '\u001B\u005B\u0042'); // emulate pressed down arrow
        expect(stdoutMock.buffer).to.be.equal('second');
        pointerCommandsPosition++;
        expect(execConsole.controls.typedCommandsPointer).to.be.equal(pointerCommandsPosition);


        stdinMock.emit('data', '\u001B\u005B\u0042'); // emulate pressed down arrow
        expect(stdoutMock.buffer).to.be.equal('');
        expect(execConsole.controls.typedCommandsPointer).to.be.equal(pointerCommandsPosition);


        stdinMock.emit('data', '\u001B\u005B\u0042'); // emulate pressed down arrow
        expect(stdoutMock.buffer).to.be.equal('');
        expect(execConsole.controls.typedCommandsPointer).to.be.equal(pointerCommandsPosition);


        expect(goDownToCommandsHistory_SPY.callCount).to.be.equal(4);
        expect(goUpToCommandsHistory_SPY.callCount).to.be.equal(4);
        next();
    });
    it('should have function convert char to unicode', next => {
        expect(execConsole.actions.toUnicode('s').indexOf('u0073')).to.be.equal(1);
        next();
    });
    it('should have help command by undefined', next => {
        expect(handleHelpCommand_SPY.callCount).to.be.equal(0);
        stdinMock.emit('data', 'h');
        stdinMock.emit('data', 'e');
        stdinMock.emit('data', 'l');
        stdinMock.emit('data', 'p');
        stdoutMock.rawBuffer = '';
        stdinMock.emit('data', '\u000D'); // emulate pressed enter
        assert.isTrue(!!~stdoutMock.rawBuffer.indexOf(usageMsg));
        expect(handleHelpCommand_SPY.callCount).to.be.equal(1);
        next();
    });
    it('should runs in raw mode', next => {
        expect(stdinMock.setRawMode.callCount).to.be.equal(1);
        assert.isTrue(stdinMock.setRawMode.args[0][0]);
        next();
    });
    it('should runs resume', next => {
        expect(stdinMock.resume.callCount).to.be.equal(1);
        next();
    });
    it('should runs in "utf-8" encoding', next => {
        expect(stdinMock.setEncoding.callCount).to.be.equal(1);
        expect(stdinMock.setEncoding.args[0][0].toLocaleLowerCase().replace('-', '')).to.be.equal('utf8');
        next();
    });
    it('should allows to override standard actions', next => {
        execConsole.actions.moveCursorToRight = function() {
            execConsole.controls.stdout.write('123');
        };
        let moveCursorToRight_SPY = sinon.spy(execConsole.actions, "moveCursorToRight");
        stdinMock.emit('data', '\u001B\u005B\u0043'); // emulate pressed right arrow key
        expect(moveCursorToRight_SPY.callCount).to.be.equal(1);
        expect(stdoutMock.buffer).to.be.equal('123');
        next();
    });
    it('should allows add a new key and action', next => {
        assert.isTrue(typeof execConsole.actions.newAction === 'undefined');
        assert.isTrue(typeof execConsole.keys['\u0073'] === 'undefined');
        execConsole.actions.newAction = function() {
            execConsole.controls.stdout.write('124');
        };
        execConsole.keys['\u0073'] = execConsole.actions.newAction;
        stdinMock.emit('data', '\u0073'); // emulate pressed 's' key
        expect(stdoutMock.buffer).to.be.equal('124');
        next();
    });
    it('should allows add a new command and should pass all parsed args into run function command', next => {
        execConsole.commands['w'] = {
            run: function(a,b,c) {
                execConsole.controls.stdout.clearLine();
                execConsole.controls.stdout.write(`${a}${b}${c}`);
            }
        };
        stdinMock.emit('data', 'w');
        stdinMock.emit('data', '\u0020'); // space
        stdinMock.emit('data', '3');
        stdinMock.emit('data', '\u0020'); // space
        stdinMock.emit('data', '4');
        stdinMock.emit('data', '\u0020'); // space
        stdinMock.emit('data', '5');
        stdinMock.emit('data', '\u000D'); // emulate pressed enter
        expect(stdoutMock.buffer).to.be.equal('345');
        next();
    });
});