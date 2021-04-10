const editor = new SimpleMDE({
  element: document.getElementById('editor'),
  spellChecker: false,
  toolbar: false,
  status: false,
  indentWithTabs: false
});

editor.codemirror.options.readOnly = 'nocursor';
editor.codemirror.options.smartIndent = false;
editor.codemirror.options.dragDrop = false;
editor.codemirror.setOption('extraKeys', { Enter: (command) => command.replaceSelection('\n') });

editor.codemirror.on('change', (_instance, changeObj) => {
  if (changeObj.origin == '+input') {
    if (changeObj.removed == '') {
      // one or more characters inserted
      let chars;
      if (changeObj.text.length == 2 && changeObj.text[0] == '' && changeObj.text[1] == '') {
        chars = '\n';
      } else {
        chars = changeObj.text.join('\n');
      }
      const index = editor.codemirror.indexFromPos(changeObj.to);
      documentData.insert_fromLocal(chars, index);
    } else {
      // range replaced
      let chars;
      if (changeObj.text.length == 2 && changeObj.text[0] == '' && changeObj.text[1] == '') {
        chars = '\n';
      } else {
        chars = changeObj.text.join('\n');
      }
      const index = editor.codemirror.indexFromPos(changeObj.from);
      const length = changeObj.removed.reduce((total, current) => {
        return total + current.length;
      }, 0) + changeObj.removed.length - 1;
      documentData.replace_fromLocal(chars, index, length);
    }
  } else if (changeObj.origin == '+delete') {
    // character deleted
    const index = editor.codemirror.indexFromPos(changeObj.from);
    const length = changeObj.removed.reduce((total, current) => {
      return total + current.length;
    }, 0) + changeObj.removed.length - 1;
    documentData.delete_fromLocal(index, length);
  }
});

const onCursorActivity = (function () {
  const DELAY = 50;

  let last = undefined;
  let timeoutHandle = undefined;

  const sendCursor = () => {
    broadcast({
      operation: OPERATION.SEND_CURSOR,
      payload: {
        user: peerID,
        position: editor.codemirror.getCursor()
      }
    });
  };

  return () => {
    const now = performance.now();
    const diff = last ? now - last : Infinity;
    last = now;

    if (diff < DELAY) {
      if (timeoutHandle != undefined) {
        clearTimeout(timeoutHandle);
      }
      timeoutHandle = setTimeout(sendCursor, DELAY);
    } else {
      sendCursor();
    }
  };
})();

editor.codemirror.on('cursorActivity', onCursorActivity);

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
  const widgetNode = cursor.widgetNode;
  cursor.clear();

  return editor.codemirror.setBookmark(position, { widget: widgetNode });
}