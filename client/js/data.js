class Character {
  constructor (char, pos, user) {
    this.char = char;
    this.pos = pos;
    this.user = user;
  }
}

/**
 * Contains a data structure representing the document shared by the peers
 * this class encapsulates the Document class from the WebAssembly module
 */
class Document {
  constructor (size) {
    // shared Int16 array between JavaScript and WebAssembly
    this.sharedMemory = this.allocateArray_i16(size);
    // the WebAssembly Document instance
    this.instance = new Module.Document(parseInt(peerID), this.sharedMemory.offset);
    // keeps track of the other peers cursors position
    this.cursors = new Map();
  }

  updateCursor ({ user, position }) {
    let cursor = this.cursors.get(user);
    cursor = cursor != undefined ? moveCursor(cursor, position) : createCursor(user, position);
    this.cursors.set(user, cursor);
  }

  removeCursor (user) {
    const cursor = this.cursors.get(user);
    if (cursor != undefined) {
      cursor.clear();
      this.cursors.delete(user);
    }
  }

  /**
   * Allocates memory for a signed Int16 array on the heap to exchange position vectors between
   * JavaScript and WebAssembly 
   * @param {number} size 
   * @returns {object {array: Int16Array, address: number}} 
   */
  allocateArray_i16 (size) {
    const offset = Module._malloc(size << 1);
    Module.HEAP16.set(new Int16Array(size), (offset >> 1));

    return {
      array: Module.HEAP16.subarray((offset >> 1), (offset >> 1) + size),
      offset
    };
  }

  /**
   * Transfers a JavaScript array containing a position vector onto the heap
   * @param {number[]} pos 
   */
  posToHeap (pos) {
    for (let i = 0; i < pos.length; ++i) {
      this.sharedMemory.array[i] = pos[i];
    }
  }

  /**
   * Retrieves a Character object from the heap
   * @param {number} len the length of the position vector on the heap
   * @returns {Character} retrieved Character object
   */
  charFromHeap (len) {
    const char = String.fromCharCode(this.sharedMemory.array[len]);
    const pos = Array.prototype.slice.call(this.sharedMemory.array, 0, len);
    const user = this.sharedMemory.array[len + 1];

    return new Character(char, pos, user);
  }

  /**
   * Copies a document received from a peer
   * @param {Character[]} document
   */
  copyDocument (document) {
    // send each Character object to the WebAssembly module
    for (const newChar of document) {
      this.posToHeap(newChar.pos);
      this.instance.pushNextCharacter(newChar.char.charCodeAt(0), newChar.user, newChar.pos.length);
    }

    // copy each character in the editor and remove read only property
    editor.codemirror.setValue(document.map((newChar) => newChar.char).join(''));
    editor.codemirror.setOption('readOnly', false);

    // send own and then request others cursor positions
    broadcast({
      operation: OPERATION.SEND_CURSOR,
      payload: {
        user: peerID,
        position: {
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

  /**
   * Retrieves the document from the WebAssembly module to send it to a peer
   * @returns {Character[]} document
   */
  getDocument () {
    const document = [];
    for (let i = 0; i < this.instance.size(); ++i) {
      const len = this.instance.getCharacterAt(i);
      document.push(this.charFromHeap(len));
    }

    return document;
  }

  /**
   * Inserts one or more Characters written in the editor into the Document instance and broadcasts
   * the operation to the other peers
   * @param {string} newChars 
   * @param {number} index 
   */
  insert_fromLocal (newChars, index) {
    const charArray = [];
    for (let i = 0; i < newChars.length; ++i) {
      const len = this.instance.insert_fromLocal(newChars.charCodeAt(i), index + i);
      charArray.push(this.charFromHeap(len));
    }

    broadcast({
      operation: OPERATION.INSERT,
      payload: charArray
    });
  }

  /**
   * Deletes one or multiple Characters from the Document instance and then broadcasts the
   * operation on the network
   * @param {number} index 
   * @param {number} length
   */
  delete_fromLocal (index, length) {
    const deletedChars = [];
    for (let i = length - 1; i >= 0; --i) {
      const len = this.instance.delete_fromLocal(index + i);
      deletedChars.push(this.charFromHeap(len));
    }

    broadcast({
      operation: OPERATION.DELETE,
      payload: deletedChars
    });
  }

  /**
   * Replaces a range of Characters from the Document instance with one or more Characters and
   * broadcasts the operation on the network
   * @param {string} newChars 
   * @param {number} index 
   * @param {number} length 
   */
  replace_fromLocal (newChars, index, length) {
    const deletedChars = [];
    for (let i = length - 1; i >= 0; --i) {
      const len = this.instance.delete_fromLocal(index + i);
      deletedChars.push(this.charFromHeap(len));
    }

    const insertedChars = [];
    for (let i = 0; i < newChars.length; ++i) {
      const len = this.instance.insert_fromLocal(newChars.charCodeAt(i), index + i);
      insertedChars.push(this.charFromHeap(len));
    }

    broadcast({
      operation: OPERATION.REPLACE,
      payload: {
        deletedChars,
        insertedChars
      }
    });
  }

  /**
   * Inserts one or more Characters written by a peer into the Document instance as well as in the
   * editor, these Characters all have the same insert position in the editor
   * @param {Character[]} newChars 
   */
  insert_fromRemote (newChars) {
    const newCharsArray = [];
    let from = undefined;

    for (const newChar of newChars) {
      this.posToHeap(newChar.pos);
      const index = this.instance.insert_fromRemote(newChar.char.charCodeAt(0), newChar.user, newChar.pos.length);

      if (index != -1) {
        newCharsArray.push(newChar.char);
        if (from == undefined) {
          from = editor.codemirror.posFromIndex(index);
        }
      }
    }

    // codemirror.replaceRange is costly, insert all at once
    if (from != undefined) {
      editor.codemirror.replaceRange(newCharsArray.join(''), from);
    }
  }

  /**
   * Deletes one or multiple Characters received by a peer from the Document instance and the
   * editor, these Characters are in a continuous string in the editor
   * @param {Character[]} deletedChars 
   */
  delete_fromRemote (deletedChars) {
    let from = Infinity;
    let to = -Infinity;

    for (const char of deletedChars) {
      this.posToHeap(char.pos);
      const index = this.instance.delete_fromRemote(char.char.charCodeAt(0), char.user, char.pos.length);

      if (index != -1) {
        from = Math.min(index, from);
        to = Math.max(index + 1, to);
      }
    }

    // codemirror.replaceRange is costly, delete all at once
    if (from < to) {
      from = editor.codemirror.posFromIndex(from);
      to = editor.codemirror.posFromIndex(to);

      editor.codemirror.replaceRange('', from, to);
    }
  }

  /**
   * Replaces a list of Characters received from a peer from the Document instance and inserts one
   * or more Characters in their place
   * @param {object {Character[], Character[]}} { deletedChars, insertedChars } 
   */
  replace_fromRemote ({ deletedChars, insertedChars }) {
    this.delete_fromRemote(deletedChars);
    this.insert_fromRemote(insertedChars);
  }
}
