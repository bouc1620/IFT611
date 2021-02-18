class Character {
    #id_user
    #char
    /* 
    Array with position column only [1, 0]
    1 represent the column position in the editor
    0 represent the position of character in array (if need to be between two character)
    */
    #position 

    constructor(id_user,char,position) {
        this.#id_user = id_user;
        this.#char = char;
        this.#position = position;
    }

    get user() {
        return this.#id_user;
    }

    get position() {
        return this.#position;
    }

    get char() {
        return this.#char;
    }
}

class Document {
    #doc_array

    constructor() {
        this.#doc_array = [];
    }

    /*
        position contains line and column position
    */
    addCharacterLocal(id_user, char, position) 
    {
        var line_array = this.#doc_array[position.line];

        if (line_array === undefined) {

            var column_array = [];
            var line_array = [];
            var position_gen = [position.ch,0]; // TODO : support position between two characters
            column_array.push(new Character(id_user,char[0],position_gen)) // TODO : support multiple characters
            line_array.push(column_array);
            this.#doc_array.push(line_array);
        } else {
            var column_array = line_array[position.ch];
            
        }
    }
}

const documentData = new Document();