const MIN = 1; // 2^0
const MID = 32768; // 2^15
const MAX = 1073741824; // 2^30

class Character {
  constructor (char, pos, user) {
    this.char = char;
    this.pos = pos;
    this.user = user;
  }

  static comparePos (char1, char2) {
    for (let i = 0; i < Math.min(char1.pos.length, char2.pos.length); i++) {
      if (char1.pos[i] > char2.pos[i]) {
        return 1;
      } else if (char1.pos[i] < char2.pos[i]) {
        return -1;
      }
    }

    if (char1.pos.length > char2.pos.length) {
      return 1;
    } else if (char1.pos.length < char2.pos.length) {
      return -1;
    }

    if (char1.user > char2.user) {
      return 1;
    } else if (char1.user < char2.user) {
      return -1;
    }

    return 0;
  }

  /**
   * Generates a position array in between the before and after arguments
   * @param {Character.pos} before 
   * @param {Character.pos} after 
   * @returns {Character.pos} newPos
   */
  static genPosBetween (before, after) {
    let newPos;
    if (before) {
      if (after) {
        if (before[0] + 1 >= after[0]) {
          if (before.length == after.length) {
            if (before.length == 1) {
              newPos = [before[0], MID];
            } else if (before[before.length - 1] << 1 == after[after.length - 1]) {
              newPos = Object.values(before);
              newPos.push(MID);
            } else {
              newPos = Object.values(before);
              newPos[newPos.length - 1] <<= 1;
            }
          } else if (before.length > after.length) {
            newPos = Object.values(before);
            if (before[before.length - 1] == MAX) {
              newPos.push(MID);
            } else {
              newPos[newPos.length - 1] <<= 1;
            }
          } else {
            newPos = Object.values(after);
            if (after[after.length - 1] == MIN) {
              newPos.push(MID);
            } else {
              newPos[newPos.length - 1] >>>= 1;
            }
          }
        } else {
          newPos = [before[0] + 1];
        }
      } else {
        newPos = [before[0] + 1];
      }
    } else if (after) {
      if (after.length == 1) {
        if (after[0] > 1) {
          newPos = [after[0] - 1];
        } else {
          newPos = [0, MID];
        }
      } else if (after[after.length - 1] == MIN) {
        newPos = Object.values(after);
        newPos.push(MID);
      } else {
        newPos = Object.values(after);
        newPos[newPos.length - 1] >>>= 1;
      }
    } else {
      newPos = [1];
    }
    return newPos;
  }
}

class Document {
  constructor () {
    this.document = [];
    this.alreadyCopied = false;
    this.backlog = {
      insert: [],
      delete: [],
      replace: [],
      copy: []
    };
  }

  copyDocument (document) {
    if (this.alreadyCopied) {
      return;
    }

    this.document = document;

    this.alreadyCopied = true;
    editor.codemirror.setOption('readOnly', false);

    editor.codemirror.setValue(this.document.map((charObject) => charObject.char).join(''));

    this.processBacklog();
  }

  insert_fromLocal (char, index, user) {
    const before = index != 0 ? this.document[index - 1].pos : null;
    const after = this.document.length > index ? this.document[index].pos : null;

    let newPos = Character.genPosBetween(before, after);
    const newChar = new Character(char, newPos, user);

    this.document.splice(index, 0, newChar);

    broadcast(JSON.stringify({
      operation: 'insert',
      payload: newChar
    }));
  }

  insert_fromRemote (char) {
    if (!this.alreadyCopied) {
      this.backlog.insert.push(char);
      return;
    }

    let index = this.findCharIndex(char);

    this.document.splice(index, 0, char);
    editor.codemirror.replaceRange(char.char, editor.codemirror.posFromIndex(index));
  }

  replace_fromLocal (char, pos, user) {
    // TODO
  }

  replace_fromRemote () {
    if (!this.alreadyCopied) {
      this.backlog.replace.push(/* arguments in an object */);
      return;
    }

    // TODO
  }

  delete_fromLocal (char, pos, user) {
    // TODO
  }

  delete_fromRemote () {
    if (!this.alreadyCopied) {
      this.backlog.delete.push(/* arguments in an object */);
      return;
    }

    // TODO
  }

  /**
   * Processes the operation backlog containing the operations received while the peer
   * was waiting for a copy of the document
   */
  processBacklog () {
    let exists = false;
    for (let [_log, list] of Object.entries(this.backlog)) {
      if (list.length > 0) {
        console.debug(list);
        exists = true;
      }
    }

    // TODO, process the operations received before the document initialization

    console.debug(`processBacklog, not implemented yet. there is ${exists ? 'a' : 'no'} backlog`);
  }

  /**
   * Performs a binary search to find either the Character's correct insertion index in the
   * document array or the Character's actual index if it was found in the array
   * @param {Character} char 
   * @returns {number} index
   */
  findCharIndex (char) {
    let low = 0;
    let high = this.document.length - 1;

    while (low <= high) {
      let k = (low + high) >>> 1;
      let compare = Character.comparePos(char, this.document[k]);

      if (compare == 1) {
        low = k + 1;
      } else if (compare == -1) {
        high = k - 1;
      } else {
        return k;
      }
    }

    return high + 1;
  }
}

const documentData = new Document();