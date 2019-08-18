'use babel';

import { CompositeDisposable } from 'atom';
import { getFile } from './utils/file';
import { getRandomInterval } from './utils/timing';
import { warn } from './utils/notify';
import AutoTypeView from './auto-type-view';
import InputDialog from '@aki77/atom-input-dialog';
import path from 'path';

const LABEL_TEXT = 'Enter a file path to use with auto-type:';

export default {
  autoTypeView: null,
  editor: null,
  isJavaScript: false,
  isTyping: false,
  shouldType: true,
  subscriptions: null,

  activate(state) {
    this.autoTypeView = new AutoTypeView(state.autoTypeViewState);
    this.editor = atom.workspace.getActiveTextEditor();
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'auto-type:from-file': () => this.openDialog()
    }));
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'auto-type:stop': () => this.stop()
    }));
  },
  deactivate() {
    this.subscriptions.dispose();
    this.autoTypeView.destroy();
    this.isTyping = false;
    this.shouldType = true;
  },
  getEditorLineText() {
    return this.editor.lineTextForBufferRow(
      this.editor.getCursorBufferPosition().row + 1
    ).trim();
  },
  handleAutoBracketJavaScriptLine(editorLineText) {
    this.editor.moveDown(1);

    if (editorLineText.endsWith(')')) {
      this.editor.moveToEndOfLine();
      this.editor.deleteToPreviousWordBoundary();
      this.editor.insertText(';');
    }
  },
  async handleInput(filePath) {
    const file = getFile(filePath);
    const exists = await file.exists();

    if (!exists) return warn(`The file ${filePath} does not exist.`);

    this.typeFile(file);
  },
  async iterate(methodName, items) {
    let done = false;
    let asyncItems = this[methodName](items);

    while (!done) {
      if (!this.shouldType) break;

      ({ done } = await asyncItems.next());
    }
  },
  async openDialog() {
    if (this.isTyping) return warn('Cannot run auto-type while auto-typing');

    if (!this.editor) {
      this.editor = await atom.workspace.open();
    }

    this.isJavaScript = this.editor.getGrammar().name === 'JavaScript';

    const dialog = new InputDialog({
      callback: (input) => this.handleInput(input),
      labelText: LABEL_TEXT
    });

    dialog.attach();
  },
  serialize() {
    return { autoTypeViewState: this.autoTypeView.serialize() };
  },
  stop() {
    this.shouldType = false;
  },
  typeChars: async function* (chars) {
    for (let i = 0; i < chars.length; i++) {
      yield new Promise((resolve) =>
        setTimeout(() =>
          resolve(this.editor.insertText(chars[i])),
            chars[i].match(/\S/) ? getRandomInterval() : 0));
    }
  },
  async typeFile(file) {
    try {
      this.isTyping = true;

      const content = await file.read();

      this.editor.moveToBeginningOfLine();

      await this.iterate('typeLines', content.split('\n'));
    } catch(ex) {
      console.error(ex);
    } finally {
      this.isTyping = false;
      this.shouldType = true;
    }
  },
  async typeJavaScriptLine(line, i, numLines) {
    let editorLineText = this.getEditorLineText();

    if (editorLineText === line.replace(/;$/, '').trim()) {
      return this.handleAutoBracketJavaScriptLine(editorLineText);
    }

    return this.typeLine(line, i, numLines);
  },
  typeLine(line, i, numLines) {
    if (i && i < numLines - 2) {
      this.editor.insertNewline();
      this.editor.moveToBeginningOfLine();
    }

    return this.iterate('typeChars', line.split(''));
  },
  typeLines: async function* (lines) {
    for (let i = 0; i < lines.length; i++) {
      yield new Promise((resolve) =>
        resolve(this[this.isJavaScript ? 'typeJavaScriptLine' : 'typeLine'](
          lines[i], i, lines.length
        )));
    }
  }
};
