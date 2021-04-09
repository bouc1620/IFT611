const editor = new SimpleMDE({
  element: document.getElementById('editor'),
  spellChecker: false,
  toolbar: false,
  status: false,
  indentWithTabs: false,
  readOnly: 'nocursor'
});

editor.codemirror.options.readOnly = 'nocursor';
editor.codemirror.options.smartIndent = false;
editor.codemirror.options.dragDrop = false;
editor.codemirror.setOption('extraKeys', { Enter: (command) => command.replaceSelection('\n') });

editor.codemirror.on('change', (_instance, changeObj) => {
  if (changeObj.origin == '+input') {
    if (changeObj.removed == '') {
      // character inserted
      let char = changeObj.text.length > 1 ? '\n' : changeObj.text[0];
      let index = editor.codemirror.indexFromPos(changeObj.to);
      documentData.insert_fromLocal(char, index);
    } else {
      // range replaced
      let char = changeObj.text.length > 1 ? '\n' : changeObj.text[0];
      let index = editor.codemirror.indexFromPos(changeObj.from);
      let length = changeObj.removed.reduce((total, current) => {
        return total + current.length;
      }, 0) + changeObj.removed.length - 1;
      documentData.replace_fromLocal(char, index, length);
    }
  } else if (changeObj.origin == '+delete') {
    // character deleted
    let index = editor.codemirror.indexFromPos(changeObj.from);
    let length = changeObj.removed.reduce((total, current) => {
      return total + current.length;
    }, 0) + changeObj.removed.length - 1;
    documentData.delete_fromLocal(index, length);
  }
});

editor.codemirror.on('cursorActivity', (instance) => {
  broadcast({
    operation: OPERATION.SEND_CURSOR,
    payload: {
      user: peerID,
      pos: instance.getCursor()
    }
  });
});

const CURSORS_COLORS = [
  '#ff0000',
  '#ff6600',
  '#0066ff',
  '#00ffff',
  '#ff00ff',
  '#663300',
  '#ffff00',
  '#6600ff',
  '#ff0066',
  '#006633'
];

function createCursor (user, position) {
  const cursorElement = document.createElement('span');
  cursorElement.classList.add('cursor');

  cursorElement.style.borderLeftColor = CURSORS_COLORS[user % CURSORS_COLORS.length];

  const { _left, top, bottom } = editor.codemirror.cursorCoords(position);
  cursorElement.style.height = `${bottom - top}px`;

  return editor.codemirror.setBookmark(position, { widget: cursorElement });
}

function moveCursor (cursor, position) {
  cursor.clear();
  return editor.codemirror.setBookmark(position, { widget: cursor.widgetNode });
}