#ifndef DOCUMENT_H
#define DOCUMENT_H

#include <vector>

#include "Character.h"

using namespace std;

class Document {
public:
    using chr_t = Character::chr_t;
    using usr_t = Character::usr_t;
    using pos_t = Character::pos_t;
    using pos_ptr_t = Character::pos_ptr_t;
    using pos_vector_t = Character::pos_vector_t;

private:
    // this peer's id
    usr_t self;
    // the address of the signed Int16 array on the heap used to exchange position vectors
    // between JavaScript and WebAssembly
    pos_ptr_t posArray_offset;
    // the synchronized content of the collaborative text editor
    vector<Character> doc;
    // delete operations that were received from peers before their insert operation
    vector<Character> delBacklog;

public:
    Document() = delete;

    // Document constructor with peer id and the address of the signed Int16 array on the heap
    // used to exchange position vectors between JavaScript and WebAssembly
    Document(usr_t self, uintptr_t posArray_offset);

    // update the array offset if it was changed from JavaScript (if more space was needed)
    void updateArrayOffset(uintptr_t posArray_offset);

    int size();

    // push the Character object at the specified index onto the heap and return the length of
    // its position vector
    int getCharacterAt(int index);

    // iterate over this function from JavaScript to copy a document character by character
    void pushNextCharacter(chr_t chr, usr_t usr, int len);

    // insert a Character in the document from local
    // adds the Character's position vector on the reserved space on the heap and returns its length
    int insert_fromLocal(chr_t chr, int idx);

    // deletes a Character from the document that was deleted from local and returns the length of its
    // position vector
    int delete_fromLocal(int idx);

    // inserts a Character in the document that was received from a peer on the network
    // returns the index where to add the character in the Codemirror editor or -1
    // if the Character was found in the deletion backlog
    int insert_fromRemote(chr_t chr, usr_t usr, int len);

    // deletes a Character from the document that was deleted by a peer on the network
    // returns the index of the character to remove in the Codemirror editor or -1
    // if the Character was added to the deletion backlog
    int delete_fromRemote(chr_t chr, usr_t usr, int len);

    // prints the document's content, for debugging
    void printDocument() const;

private:
    // performs a binary search to find either the Character's correct insertion index
    // in the document or the Character's actual index if it was found
    // pair.first: is it an insertion index or was the actual Character found? - pair.second: the index
    pair<bool, int> findCharIndex(const Character& chr);
};

#endif