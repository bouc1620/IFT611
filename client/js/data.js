class Character {
  constructor (char, pos, user) {
    this.char = char;
    this.pos = pos;
    this.user = user;
  }
}

/**
 * Contains a data structure representing the document shared by the peers
 * this class encapsulates the Document class written in C++ and transpiled to WebAssembly
 */
class Document {
  constructor (size) {
    // shared i32 array between JavaScript and WebAssembly
    this.sharedMemory = this.AllocateArray_i32(size);
    // the WebAssembly Document instance
    this.instance = new Module.Document(peerID, this.sharedMemory.offset);
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
    if (cursor) {
      cursor.clear();
      this.cursors.delete(user);
    }
  }

  /**
   * Allocates memory for a signed i32 array on the heap to exchange position vectors between
   * JavaScript and WebAssembly 
   * @param {number} size 
   * @returns {object {array: Int32Array, address: number}} 
   */
  AllocateArray_i32 (size) {
    const offset = Module._malloc(size << 2);
    Module.HEAP32.set(new Int32Array(size), (offset >> 2));

    return {
      array: Module.HEAP32.subarray((offset >> 2), (offset >> 2) + size),
      offset
    };
  }

  /**
   * Transfers a JavaScript array containing a position vector on to the heap
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
    const char = this.sharedMemory.array[len];
    const pos = this.sharedMemory.array.slice(0, len);
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

    // copy each character in the editor
    editor.codemirror.setValue(document.map((newChar) =>
      String.fromCharCode(newChar.char)).join('')
    );
    editor.codemirror.setOption('readOnly', false);

    // send own and request others cursor positions
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
   * Sends a Character written in the editor to the Document instance and broadcasts it to other
   * peers
   * @param {string} char 
   * @param {number} index 
   */
  insert_fromLocal (char, index) {
    const len = this.instance.insert_fromLocal(char.charCodeAt(0), index);
    const newChar = this.charFromHeap(len);

    broadcast({
      operation: OPERATION.INSERT,
      payload: newChar
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
    for (let i = 0; i < length; ++i) {
      const len = this.instance.delete_fromLocal(index + i);
      deletedChars.push(this.charFromHeap(len));
    }

    broadcast({
      operation: OPERATION.DELETE,
      payload: deletedChars
    });
  }

  /**
   * Replaces a range of Characters from the Document instance with a single new Character and
   * broadcasts the operation on the network
   * @param {string} char 
   * @param {number} index 
   * @param {number} length 
   */
  replace_fromLocal (char, index, length) {
    const deletedChars = [];
    for (let i = 0; i < length; ++i) {
      const len = this.instance.delete_fromLocal(index + i);
      deletedChars.push(this.charFromHeap(len));
    }

    const len = this.instance.insert_fromLocal(char.charCodeAt(0), index);
    const newChar = this.charFromHeap(len);

    broadcast({
      operation: OPERATION.REPLACE,
      payload: {
        deletedChars,
        newChar
      }
    });
  }

  /**
   * Sends a Character written by a peer to the Document instance and inserts it inside the editor
   * @param {Character} newChar 
   */
  insert_fromRemote (newChar) {
    this.posToHeap(newChar.pos);
    index = this.instance.insert_fromRemote(newChar.char.charCodeAt(0), newChar.user, newChar.pos.length);

    editor.codemirror.replaceRange(newChar.char, editor.codemirror.posFromIndex(index));
  }

  /**
   * Deletes one or multiple Characters received by a peer from the Document instance and the
   * editor
   * @param {Character[]} deletedChars 
   */
  delete_fromRemote (deletedChars) {
    for (const char of deletedChars) {
      this.posToHeap(char.pos);
      const index = this.instance.delete_fromRemote(char.char.charCodeAt(0), char.user, char.pos.length);

      if (index != -1) {
        const editorPos = editor.codemirror.posFromIndex(index + 1);
        editor.codemirror.replaceRange('', editor.codemirror.posFromIndex(index), editorPos);
      }
    }
  }

  /**
   * Replaces a list of Characters received from a peer from the Document instance and inserts a
   * new Character in their place
   * @param {{Character[], Character}} { deletedChars, newChar } 
   */
  replace_fromRemote ({ deletedChars, newChar }) {
    this.delete_fromRemote(deletedChars);
    this.insert_fromRemote(newChar);
  }
}