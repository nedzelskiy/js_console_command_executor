'use strict';

const availableCommands = {};
const { expect, assert } = require('chai');
const EventEmitter = require('events');
const execConsole = require('./index.js')(availableCommands);

let stdoutMock = {
    buffer: '',
    write: function(data) {
        this.buffer = this.buffer + data;
    },
    clearLine: function() {
        this.buffer = '';
    },
    cursorTo: function() {}
};

let stdinMock = new EventEmitter();

stdinMock.setRawMode = function(bool) {
    return bool;
};
stdinMock.resume = function() {};
stdinMock.setEncoding = function(str) {
    return str;
};

execConsole.controls.stdout = stdoutMock;
execConsole.controls.stdin = stdinMock;
execConsole();

describe('JS console command executor', () => {

    beforeEach(() => {
        stdoutMock.buffer = '';
        execConsole.controls.buffer = '';
        execConsole.controls.commandLine = '';
        execConsole.controls.typedCommands = [];
        execConsole.controls.cursorPosition = '';
        execConsole.controls.typedCommandsPointer = -1;
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
        let toUnicode = execConsole.actions.toUnicode;
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
        next();
    });
    it('should step cursor left to one position after pressed left arrow', next => {
        execConsole.controls.cursorPosition = 4;
        execConsole.actions.moveCursorToLeft(execConsole.controls, execConsole.commands);
        expect(execConsole.controls.cursorPosition).to.be.equal(3);
        execConsole.controls.cursorPosition = 0;
        execConsole.actions.moveCursorToLeft(execConsole.controls, execConsole.commands);
        expect(execConsole.controls.cursorPosition).to.be.equal(0);
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
        next();
    });
    it('should shows previous command after pressed up arrow', next => {
        stdinMock.emit('data', 'd');
        console.log(stdoutMock.buffer);
        // goUpToCommandsHistory
        next();
    });
});