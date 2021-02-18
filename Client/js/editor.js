
const changesInEditor = function(instance, changeObj) {
    debugInfo(changeObj);
    if(changeObj.origin === "+input") {
        documentData.addCharacterLocal(0,changeObj.text,changeObj.from);
    }
}

const debugInfo = function(changeObj) {
    console.log("Type Change : " + changeObj.origin);
    console.log("Value insert : " + changeObj.text);
    console.log("Value removed : " + changeObj.removed);
    console.log("From");
    console.log(changeObj.from);
    console.log("To");
    console.log(changeObj.to);
}

const simplemde = new SimpleMDE({ 
    element: document.getElementById("editor"),
    spellChecker: false,
    toolbar: false
});

simplemde.codemirror.on("change", changesInEditor);
simplemde.codemirror.on("cursorActivity", function(instance) {
    console.log(instance);
});