#ifndef CHARACTER_H
#define CHARACTER_H

#include <vector>
#include <string>
#include <iostream>

using namespace std;

class Character {
public:
    using chr_t = int16_t;
    using usr_t = int16_t;
    using pos_t = int16_t;
    using pos_ptr_t = pos_t*;
    using pos_vector_t = vector<pos_t>;

    static const pos_t POS_BEGIN = 0;

    // the position vector of the first Character in a document
    static const pos_vector_t posFirst;

private:
    // the character's ASCII number
    chr_t chr;
    // a vector representing a Character's position in the document
    pos_vector_t pos;
    // the author's peer id
    usr_t usr;

public:
    Character() = default;

    // Character constructor from raw data received from JavaScript
    Character(chr_t chr, usr_t usr, pos_ptr_t pos, int len);

    Character(chr_t chr, usr_t usr, pos_vector_t pos);

    bool operator!=(const Character& other) const;

    bool operator==(const Character& other) const;

    friend ostream& operator<<(ostream& os, const Character& obj) {
        string chr_;
        if (obj.chr == 10) { chr_ = "\\n"; }
        else if (obj.chr == 9) { chr_ = "\\t"; }
        else { chr_ = string(1, char(obj.chr)); }

        return os << "{ chr: " << chr_ << ", usr: " << obj.usr << ", pos: " << obj.posVectorToString() << " }";
    }

    chr_t getChar() const;

    string posVectorToString() const;

    // friend ostream& operator<<(ostream& os, const Character& obj);

    // copies the Character's position vector to the heap followed by its character ASCII number and
    // its author's id, returns the position vector's length
    int characterToHeap(pos_ptr_t posArray_offset) const;

    // compares the char attributes of two Character instances
    static bool chrcmp(const Character& char1, const Character& char2);

    // compares the peer id of two Characters:
    // returns -1 if char1.usr < char2.usr, 1 if char1.usr > char2.usr and 0 if char1.usr == char2.usr
    static int usrcmp(const Character& char1, const Character& char2);

    // compares the position vectors of two Character instances char1 and char2:
    // returns -1 if char1.pos < char2.pos, 1 if char1.pos > char2.pos and 0 if char1.pos == char2.pos
    static int poscmp(const Character& char1, const Character& char2);

    // creates a position vector pointing before another one, to be used
    // for a new Character inserted at the beginning of a document
    static pos_vector_t posBefore(const Character& after);

    // creates a position vector pointing after another one, to be used
    // for a new Character inserted at the end of a document
    static pos_vector_t posAfter(const Character& before);

    // creates a position vector pointing between two others
    static pos_vector_t posBetween(const Character& before, const Character& after);

private:
    // contains the logic of the other poscmp function, gives the option of comparing two position
    // vectors without them being part of a Character instance
    static int poscmp(const pos_vector_t& pos1, const pos_vector_t& pos2);
};

#endif
