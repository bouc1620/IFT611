const simpleMDE = new SimpleMDE({
    element: document.getElementById('editor'),
    spellChecker: false,
    toolbar: false,
    status: false
});

simpleMDE.codemirror.on('change', (instance, changeObj) => {
    if (changeObj.origin == '+input') {
        if (changeObj.removed == '') {
            documentData.insert_fromLocal(changeObj.text.length > 1 ? '\n' : changeObj.text[0], simpleMDE.codemirror.indexFromPos(changeObj.to), self.id);
        } else {

        }
    } else if (changeObj.origin == '+delete') {

    }
});

function insertCharacter (char, index) {
    simpleMDE.codemirror.replaceRange(char, simpleMDE.codemirror.posFromIndex(index));
}