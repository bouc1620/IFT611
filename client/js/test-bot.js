function deleteCharacter ({ logger, randomizer, window }) {
  logger.log('Delete Character gremlin initialized');
  return function attack () {

    let lineNumberFrom = randomizer.natural({ min: 0, max: editor.codemirror.lineCount() - 1 });
    let columnFrom = randomizer.natural({ min: 0, max: editor.codemirror.getLine(lineNumberFrom).length });

    let from = {
      line: lineNumberFrom,
      ch: columnFrom
    };

    let to = {
      line: lineNumberFrom,
      ch: columnFrom - randomizer.natural({ min: 1, max: 5 })
    };

    editor.codemirror.replaceRange('', from, to, '+delete');
  };
}

function replaceCharacter ({ logger, randomizer, window }) {
  logger.log('Replace Character gremlin initialized');
  return function attack () {

    let lineNumberFrom = randomizer.natural({ min: 0, max: editor.codemirror.lineCount() - 1 });
    let columnFrom = randomizer.natural({ min: 0, max: editor.codemirror.getLine(lineNumberFrom).length - 1 });

    let from = {
      line: lineNumberFrom,
      ch: columnFrom
    };

    let numberCharacters = randomizer.natural({ min: 1, max: 5 });
    let columnTo = columnFrom + numberCharacters;

    let to = {
      line: lineNumberFrom,
      ch: columnTo
    };

    editor.codemirror.replaceRange('T', from, to, '+input');
  };
}

const testBotInsert = gremlins.createHorde({
  strategies: [gremlins.strategies.bySpecies({ nb: 1000, delay: 30 })],
  species: [
    gremlins.species.formFiller()
  ],
});

const testBotDelete = gremlins.createHorde({
  strategies: [gremlins.strategies.bySpecies({ nb: 100, delay: 30 })],
  species: [
    deleteCharacter
  ],
});

const testBotReplace = gremlins.createHorde({
  strategies: [gremlins.strategies.bySpecies({ nb: 50, delay: 30 })],
  species: [
    replaceCharacter
  ],
});

this.document.getElementById("test-bot-insert").addEventListener("click", function () {
  testBotInsert.unleash();
});

this.document.getElementById("test-bot-delete").addEventListener("click", function () {
  testBotDelete.unleash();
});

this.document.getElementById("test-bot-replace").addEventListener("click", function () {
  testBotReplace.unleash();
});