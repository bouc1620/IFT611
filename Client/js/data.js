class Character {
    constructor (char, pos, user) {
        this.char = char;
        this.pos = pos;
        this.user = user;
    }

    static compare (char1, char2) {
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
}

const MIN = 1; // 2^0
const MID = 32768; // 2^15
const MAX = 1073741824; // 2^30

class Document {
    constructor () {
        this.document = [];
        this.alreadyCopied = false;
    }

    copyDocument (document) {
        if (this.alreadyCopied) {
            return;
        }

        this.document = document;

        console.debug(document);

        // enter letters in the text area
    }

    insert_fromLocal (char, index, user) {
        const before = index != 0 ? this.document[index - 1] : null;
        const after = this.document.length > index ? this.document[index] : null;

        let pos;
        if (before) {
            if (after) {
                if (before.pos[0] + 1 >= after.pos[0]) {
                    if (before.pos.length == after.pos.length) {
                        if (before.pos.length == 1) {
                            pos = [before.pos[0], MID];
                        } else if (before.pos[before.pos.length - 1] << 1 == after.pos[after.pos.length - 1]) {
                            pos = Object.values(before.pos);
                            pos.push(MID);
                        } else {
                            pos = Object.values(before.pos);
                            pos[pos.length - 1] <<= 1;
                        }
                    } else if (before.pos.length > after.pos.length) {
                        pos = Object.values(before.pos);
                        if (before.pos[before.pos.length - 1] == MAX) {
                            pos.push(MID);
                        } else {
                            pos[pos.length - 1] <<= 1;
                        }
                    } else {
                        pos = Object.values(after.pos);
                        if (after.pos[after.pos.length - 1] == MIN) {
                            pos.push(MID);
                        } else {
                            pos[pos.length - 1] >>>= 1;
                        }
                    }
                } else {
                    pos = [before.pos[0] + 1];
                }
            } else {
                pos = [before.pos[0] + 1];
            }
        } else if (after) {
            if (after.pos.length == 1) {
                if (after.pos[0] > 1) {
                    pos = [after.pos[0] - 1];
                } else {
                    pos = [0, MID];
                }
            } else if (after.pos[after.pos.length - 1] == MIN) {
                pos = Object.values(after.pos);
                pos.push(MID);
            } else {
                pos = Object.values(after.pos);
                pos[pos.length - 1] = pos[pos.length - 1] >>> 1;
            }
        } else {
            pos = [1];
        }

        const newChar = new Character(char, pos, user);

        this.document.splice(index, 0, newChar);

        broadcast(JSON.stringify({
            operation: 'insert',
            payload: newChar
        }));
    }

    insert_fromRemote (char) {
        let low = 0;
        let high = this.document.length - 1;
        let k = 0;
        while (low <= high) {
            k = (low + high) >>> 1;
            let compare = Character.compare(char, this.document[k]);

            if (compare == 1) {
                low = k + 1;
            } else if (compare == -1) {
                high = k - 1;
            } else {
                console.error('error, trying to insert same character twice');
                return;
            }
        }

        this.document.splice(high + 1, 0, char);

        insertCharacter(char.char, high + 1);
    }

    replace (char, pos, user) {
        // TODO
    }

    delete (char, pos, user) {
        // TODO
    }
}

const documentData = new Document();