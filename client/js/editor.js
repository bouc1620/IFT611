const editor = new SimpleMDE({
  element: document.getElementById('editor'),
  spellChecker: false,
  toolbar: false,
  status: false,
  indentWithTabs: false
});

//key : userId, value : color
const cursorsColor = new Map(
  [[0, '#ff0000'],  // rouge
  [1, '#ff6600'],   // orange
  [2, '#0066ff'],   // bleu
  [3, '#006600'],   // vert
  [4, '#00ffff'],   // aqua
  [5, '#ff00ff'],   // rose
  [6, '#663300'],   // brun
  [7, '#ffff00'],   // jaune
  [8, '#6600ff'],   // mauve
  [9, '#000000']]); // noir

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
    operation: 'updateCursor',
    user: self.id,
    pos: _instance.getCursor()
  });
});

function createCursor (userId, pos) {
  const cursorCoords = editor.codemirror.cursorCoords(pos);

  let ligitUserId = parseInt(userId);
  const numberMaxCursors = cursorsColor.size - 1;
  if (ligitUserId > numberMaxCursors)
    ligitUserId = numberMaxCursors;

  const cursorColor = cursorsColor.get(ligitUserId);
  const cursorBody = document.createElement('span');
  cursorBody.style.borderLeftStyle = 'solid';
  cursorBody.style.borderLeftWidth = '3px';
  cursorBody.style.borderLeftColor = cursorColor;
  cursorBody.style.height = `${(cursorCoords.bottom - cursorCoords.top)}px`;
  cursorBody.style.padding = 0;
  cursorBody.style.zIndex = 0;

  return editor.codemirror.setBookmark(pos, { widget: cursorBody });
}

function updateCursor (cursor, position) {
  const nodeWidget = cursor.widgetNode;
  cursor.clear();
  return editor.codemirror.setBookmark(position, { widget: nodeWidget });
}