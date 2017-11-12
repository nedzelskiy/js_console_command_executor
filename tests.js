'use strict';

const availableCommands = {};
const { expect, assert } = require('chai');
const exec = require('child_process').exec;
const execConsole = require('./index.js')(availableCommands);
let stdoutMock = {
    buffer: '',
    write: function(data) {
        this.buffer = this.buffer + data;
    },
    clearLine: function() {
        this.buffer = '';
    },
    cursorTo: function() {

    }
};
execConsole.controls.stdout = stdoutMock;
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

    it('should allows write chars at any case', next => {
        let testKey = execConsole.actions.testKeyForAvailableToStdout;
        assert.isTrue(testKey('a'));
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
});