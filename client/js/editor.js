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
  if (changeObj.origin == '+input' && changeObj.removed == '') {
    // one or more characters inserted
    const chars = changeObj.text.join('\n');
    const index = editor.codemirror.indexFromPos(changeObj.to);
    documentData.insert_fromLocal(chars, index);
  } else if (changeObj.origin == '+input' || changeObj.origin == 'undo' || changeObj.origin == 'redo') {
    // range replaced
    const chars = changeObj.text.join('\n');
    const index = editor.codemirror.indexFromPos(changeObj.from);
    const length = changeObj.removed.reduce((total, current) => {
      return total + current.length;
    }, 0) + changeObj.removed.length - 1;
    documentData.replace_fromLocal(chars, index, length);
  } else if (changeObj.origin == '+delete') {
    // one or more characters deleted
    const index = editor.codemirror.indexFromPos(changeObj.from);
    const length = changeObj.removed.reduce((total, current) => {
      return total + current.length;
    }, 0) + changeObj.removed.length - 1;
    documentData.delete_fromLocal(index, length);
  }
});

/**
 * A closure that keeps track of the last timestamp for a cursorActivity event in order to send the
 * new cursor location to other peers only if it hasn't moved for some time
 * For example, pasting text will fire as much cursorActivity events as there are characters in the
 * pasted text
 */
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
  '#ff0000', // red
  '#0066ff', // blue
  '#00994d', // green
  '#ff6600', // orange
  '#00ffff', // light blue
  '#ff00ff', // pink
  '#66ff33', // lime
  '#eeee00', // yellow
  '#6600ff', // navy blue
  '#cc33ff', // purple
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