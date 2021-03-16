class Character {
  constructor (char, pos, user) {
    this.char = char;
    this.pos = pos;
    this.user = user;
  }

  static equals (char1, char2) {
    return char1.char == char2.char && this.comparePos(char1, char2) == 0;
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
    const MIN = 1; // 2^0
    const MID = 32768; // 2^15
    const MAX = 1073741824; // 2^30

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
    this.deletionBacklog = [];
    this.cursors = new Map();
  }

  copyDocument (document) {
    this.document = document;

    editor.codemirror.setOption('readOnly', false);
    editor.codemirror.setValue(this.document.map((charObject) => charObject.char).join(''));

    broadcast({
      operation: OPERATIONS.SEND_CURSOR,
      payload: {
        user: self.id,
        pos: {
          line: 0,
          ch: 0
        }
      }
    });

    broadcast({
      operation: OPERATIONS.REQUEST_CURSOR,
      payload: null
    });
  }

  insert_fromLocal (char, index) {
    const before = index != 0 ? this.document[index - 1].pos : null;
    const after = this.document.length > index ? this.document[index].pos : null;

    let newPos = Character.genPosBetween(before, after);
    const newChar = new Character(char, newPos, self.id);

    this.document.splice(index, 0, newChar);

    broadcast({
      operation: OPERATIONS.INSERT,
      payload: newChar
    });
  }

  insert_fromRemote (char) {
    // search the deletion backlog to see if a delete operation was received for the Character
    let index = this.deletionBacklog.findIndex((charToRemove) => Character.equals(char, charToRemove));
    if (index != -1) {
      this.deletionBacklog.splice(index, 1);
      return;
    }

    index = this.findCharIndex(char).index;

    this.document.splice(index, 0, char);
    editor.codemirror.replaceRange(char.char, editor.codemirror.posFromIndex(index));
  }

  delete_fromLocal (index, length) {
    let removedChars = this.document.splice(index, length);

    broadcast({
      operation: OPERATIONS.DELETE,
      payload: removedChars
    });
  }

  delete_fromRemote (removed) {
    for (let charToRemove of removed) {
      let { found, index } = this.findCharIndex(charToRemove);
      if (found) {
        this.document.splice(index, 1);
        editor.codemirror.replaceRange('', editor.codemirror.posFromIndex(index), editor.codemirror.posFromIndex(index + 1));
      } else {
        this.deletionBacklog.push(charToRemove);
      }
    }
  }

  replace_fromLocal (char, index, length) {
    let removedChars = this.document.splice(index, length);

    const before = index != 0 ? this.document[index - 1].pos : null;
    const after = this.document.length > index ? this.document[index].pos : null;

    let newPos = Character.genPosBetween(before, after);
    const newChar = new Character(char, newPos, self.id);

    this.document.splice(index, 0, newChar);

    broadcast({
      operation: OPERATIONS.REPLACE,
      payload: {
        removed: removedChars,
        added: newChar
      }
    });
  }

  replace_fromRemote ({ removed, added }) {
    this.delete_fromRemote(removed);
    this.insert_fromRemote(added);
  }

  updateCursor ({ user, pos }) {
    let cursor = this.cursors.get(user);
    cursor = cursor ? moveCursor(cursor, pos) : createCursor(user, pos);
    this.cursors.set(user, cursor);
  }

  removeCursor (user) {
    const cursor = this.cursors.get(user);
    if (cursor) {
      cursor.clear();
    }
  }

  /**
   * Performs a binary search to find either the Character's correct insertion index in the
   * document array or the Character's actual index if it was found
   * @param {Character} char 
   * @returns {object} { found, index }
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
        return {
          found: char.char == this.document[k].char,
          index: k
        };
      }
    }

    return {
      found: false,
      index: high + 1
    };
  }
}

const documentData = new Document();