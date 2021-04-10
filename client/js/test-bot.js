let insertTimes = [];
let deleteTimes = [];
let replaceTimes = [];
let networkTimeMap = new Map();
let networkTimes = [];

function insertCharacter ({ logger, randomizer, window }) {
  logger.log('Insert Character gremlin initialized');
  return function attack () {

    let lineNumberFrom = randomizer.natural({ min: 0, max: editor.codemirror.lineCount() - 1 });
    let columnFrom = randomizer.natural({ min: 0, max: editor.codemirror.getLine(lineNumberFrom).length });

    let from = {
      line: lineNumberFrom,
      ch: columnFrom
    };

    let to = {
      line: lineNumberFrom,
      ch: columnFrom
    };

    const t0 = performance.now();
    editor.codemirror.replaceRange(randomizer.character(), from, to, '+input');
    const t1 = performance.now();
    insertTimes.push(t1 - t0);
    console.log(`Opération insert local : ${t1 - t0} ms.`);
  };
}

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

    const t0 = performance.now();
    editor.codemirror.replaceRange('', from, to, '+delete');
    const t1 = performance.now();
    deleteTimes.push(t1 - t0);
    console.log(`Opération delete local : ${t1 - t0} ms.`);
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

    const t0 = performance.now();
    editor.codemirror.replaceRange('T', from, to, '+input');
    const t1 = performance.now();
    replaceTimes.push(t1 - t0);
    console.log(`Opération replace local : ${t1 - t0} ms.`);
  };
}

function networkTest ({ logger, randomizer, window }) {
  logger.log('Network test gremlin initialized');
  return function attack () {
    let id_map = networkTimeMap.size;

    let characters = [];
    for (let i = 0; i < randomizer.natural({ min: 1, max: 10 }); i++) {
      characters.push(new Character(randomizer.character(), [0, 0], self.id));
    }
    const t0 = performance.now();
    networkTimeMap.set(id_map, t0);
    broadcast({
      operation: OPERATIONS.SEND_TEST_NETWORK,
      payload: {
        id_map: id_map,
        char: characters
      }
    });
  };
}

const testBotInsert = gremlins.createHorde({
  strategies: [gremlins.strategies.bySpecies({ nb: 1000, delay: 30 })],
  species: [
    insertCharacter
  ],
});

const testBotDelete = gremlins.createHorde({
  strategies: [gremlins.strategies.bySpecies({ nb: 100, delay: 30 })],
  species: [
    deleteCharacter
  ],
});

const testBotReplace = gremlins.createHorde({
  strategies: [gremlins.strategies.bySpecies({ nb: 100, delay: 30 })],
  species: [
    replaceCharacter
  ],
});

const testBotNetwork = gremlins.createHorde({
  strategies: [gremlins.strategies.bySpecies({ nb: 100, delay: 30 })],
  species: [
    networkTest
  ],
});

this.document.getElementById("test-bot-insert").addEventListener("click", function () {
  insertTimes = [];
  testBotInsert.unleash().then(() => {
    console.log(`Moyenne insert local :  ${calculerMoyenne(insertTimes)} ms`);
  });
});

this.document.getElementById("test-bot-delete").addEventListener("click", function () {
  deleteTimes = [];
  testBotDelete.unleash().then(() => {
    console.log(`Moyenne delete local :  ${calculerMoyenne(deleteTimes)} ms`);
  });
});

this.document.getElementById("test-bot-replace").addEventListener("click", function () {
  replaceTimes = [];
  testBotReplace.unleash().then(() => {
    console.log(`Moyenne replace local :  ${calculerMoyenne(replaceTimes)} ms`);
  });
});

this.document.getElementById("test-bot-network").addEventListener("click", function () {
  networkTimes = [];
  networkTimeMap = new Map();
  testBotNetwork.unleash().then(() => {
    console.log(`Moyenne du network :  ${calculerMoyenne(networkTimes)} ms`);
  });
});

function calculerMoyenne (values) {
  let sumTime = 0;
  for (var i = 0; i < values.length; i++)
    sumTime += values[i];
  return sumTime / values.length;
}