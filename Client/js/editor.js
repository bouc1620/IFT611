const editor = new SimpleMDE({
  element: document.getElementById('editor'),
  spellChecker: false,
  toolbar: false,
  status: false
});

editor.codemirror.options.readOnly = 'nocursor';
editor.codemirror.options.smartIndent = false;
editor.codemirror.options.dragDrop = false;

editor.codemirror.on('change', (_instance, changeObj) => {
  if (changeObj.origin == '+input') {
    if (changeObj.removed == '') {
      if (changeObj.text[0].length > 1) {
        editor.codemirror.indentLine(changeObj.to.line, -1 * changeObj.text[0].length);
        return;
      }

      let char = changeObj.text.length > 1 ? '\n' : changeObj.text[0];
      let index = editor.codemirror.indexFromPos(changeObj.to);
      documentData.insert_fromLocal(char, index, self.id);
    } else {
      // TODO : handle text replacement
    }
  } else if (changeObj.origin == '+delete') {
    // TODO : handle text deletion
  }
});