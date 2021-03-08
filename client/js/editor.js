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
editor.codemirror.setOption('extraKeys', { Enter: (cm) => cm.replaceSelection('\n') });

editor.codemirror.on('change', (_instance, changeObj) => {
  if (changeObj.origin == '+input') {
    if (changeObj.removed == '') {
      let char = changeObj.text.length > 1 ? '\n' : changeObj.text[0];
      let index = editor.codemirror.indexFromPos(changeObj.to);
      documentData.insert_fromLocal(char, index);
    } else {
      let char = changeObj.text.length > 1 ? '\n' : changeObj.text[0];
      let index = editor.codemirror.indexFromPos(changeObj.from);
      let length = changeObj.removed.reduce((total, current) => total + current.length, 0) + changeObj.removed.length - 1;
      documentData.replace_fromLocal(char, index, length);
    }
  } else if (changeObj.origin == '+delete') {
    let index = editor.codemirror.indexFromPos(changeObj.from);
    let length = changeObj.removed.reduce((total, current) => total + current.length, 0) + changeObj.removed.length - 1;
    documentData.delete_fromLocal(index, length);
  }
});

editor.codemirror.on('cursorActivity', (_instance) => {
  broadcast({
    operation: 'cursor',
    user: self.id,
    pos: _instance.getCursor()
  });
});

function createCursor (pos) {
  const cursorCoords = editor.codemirror.cursorCoords(pos);
  const cursorBody = document.createElement('span');
  cursorBody.style.borderLeftStyle = 'solid';
  cursorBody.style.borderLeftWidth = '1.5px';
  cursorBody.style.borderLeftColor = '#ff0000';
  cursorBody.style.height = `${(cursorCoords.bottom - cursorCoords.top)}px`;
  cursorBody.style.padding = 0;
  cursorBody.style.zIndex = 0;

  return editor.codemirror.setBookmark(pos, { widget: cursorBody });
}

function updateCursor (cursor, position) {
  console.log(cursor);
  cursor.clear();
  return createCursor(position);
}