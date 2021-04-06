class Character {
  constructor (char, pos, user) {
    this.char = char;
    this.pos = pos;
    this.user = user;
  }
}

class Document {
  constructor (size) {
    this.buffer = this.cArray_i32(size);
    this.instance = new module.Document(peerID, this.buffer.offset);
    this.cursors = new Map();
  }

  // allocates memory on the heap to exchange position vectors between
  // JavaScript and WebAssembly
  cArray_i32 (size) {
    const offset = Module._malloc(size * 4);
    Module.HEAP32.set(new Int32Array(size), offset / 4);
    return {
      'data': Module.HEAP32.subarray(offset / 4, offset / 4 + size),
      'offset': offset
    };
  }

  posToHeap (pos) {
    for (let i = 0; i < pos.length; ++i) {
      this.buffer.offset[i] = pos[i];
    }
  }

  posFromHeap (len) {
    let pos = [];
    for (let i = 0; i < len; ++i) {
      pos.push(this.buffer.offset[i]);
    }

    return pos;
  }

  copyDocument (document) {
    for (const newChar of document) {
      this.posToHeap(newChar.pos);
      this.instance.pushNextCharacter(newChar.char.charCodeAt(0), newChar.user, newChar.pos.length);
    }

    editor.codemirror.setValue(document.map((newChar) => String.fromCharCode(newChar.char)).join(''));
    editor.codemirror.setOption('readOnly', false);

    broadcast({
      operation: OPERATION.SEND_CURSOR,
      payload: {
        user: peerID,
        pos: {
          line: 0,
          ch: 0
        }
      }
    });

    broadcast({
      operation: OPERATION.REQUEST_CURSOR,
      payload: null
    });
  }

  insert_fromLocal (char, index) {
    const len = this.instance.insert_fromLocal(char.charCodeAt(0), index);

    newPos = this.posFromHeap(len);

    broadcast({
      operation: OPERATION.INSERT,
      payload: {
        char: char,
        pos: newPos,
        user: peerID
      }
    });
  }

  insert_fromRemote (char) {
    this.posToHeap(char.pos);
    index = this.instance.insert_fromRemote(char.char.charCodeAt(0), char.user, char.pos.length);

    editor.codemirror.replaceRange(char.char, editor.codemirror.posFromIndex(index));
  }

  // TODO: transférer les caractère supprimés de codemirror si
  //       possible, sous forme de string.
  delete_fromLocal (index, length, chars) {
    let deletedChars = [];
    for (let i = 0; i < length; ++i) {
      let len = this.instance.delete_fromLocal(index + i);
      deletedChars.push({
        char: chars[i],
        pos: this.posFromHeap(len),
        user: peerID
      });
    }

    broadcast({
      operation: OPERATION.DELETE,
      payload: deletedChars
    });
  }

  delete_fromRemote (charsToDelete) {
    for (const char of charsToDelete) {
      this.posToHeap(char.pos);
      let index = this.instance.delete_fromRemote(char.char.charCodeAt(0), char.user, char.pos.length);
      if (index != -1) {
        editor.codemirror.replaceRange('', editor.codemirror.posFromIndex(index), editor.codemirror.posFromIndex(index + 1));
      }
    }
  }







  replace_fromLocal (char, index, length) {




    let removedChars = this.instance.splice(index, length);

    const before = index != 0 ? this.instance[index - 1].pos : null;
    const after = this.instance.length > index ? this.instance[index].pos : null;

    let newPos = Character.genPosBetween(before, after);
    const newChar = new Character(char, newPos, self.id);

    this.instance.splice(index, 0, newChar);

    broadcast({
      operation: OPERATION.REPLACE,
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
      this.cursors.delete(user);
    }
  }
}