#include <iostream>
#include <vector>

#include "Character.h"
#include "Document.h"

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
#include <emscripten.h>

using namespace emscripten;

EMSCRIPTEN_BINDINGS(document_bindings) {
    class_<Document>("Document")
        .constructor<Document::usr_t, uintptr_t>()
        .function("updateArrayOffset", &Document::updateArrayOffset, allow_raw_pointers())
        .function("size", &Document::size)
        .function("getCharacterAt", &Document::getCharacterAt)
        .function("pushNextCharacter", &Document::pushNextCharacter)
        .function("insert_fromLocal", &Document::insert_fromLocal)
        .function("delete_fromLocal", &Document::delete_fromLocal)
        .function("insert_fromRemote", &Document::insert_fromRemote)
        .function("delete_fromRemote", &Document::delete_fromRemote)
        .function("printDocument", &Document::printDocument)
        ;
}
#endif

using namespace std;

Document::Document(usr_t self, uintptr_t posArray_offset)
    : self(self), posArray_offset(reinterpret_cast<pos_ptr_t>(posArray_offset)) {}

void Document::updateArrayOffset(uintptr_t posArray_offset) {
    this->posArray_offset = reinterpret_cast<pos_ptr_t>(posArray_offset);
}

int Document::size() {
    return doc.size();
}

int Document::getCharacterAt(int idx) {
    return doc[idx].characterToHeap(posArray_offset);
}

void Document::pushNextCharacter(chr_t chr, usr_t usr, int len) {
    doc.push_back(Character(chr, usr, posArray_offset, len));
}

int Document::insert_fromLocal(chr_t chr, int idx) {
    Character::pos_vector_t pos;

    if (idx == 0) {
        // Character inserted at the beginning...
        if (doc.size() > 0) {
            // ...of a non-empty document
            pos = Character::posBefore(doc[idx]);
        }
        else {
            // ...of an empty document
            pos = Character::posFirst;
        }
    }
    else if (doc.size() == idx) {
        // Character inserted at the end of a document
        pos = Character::posAfter(doc.back());
    }
    else {
        // Character inserted between 2 others
        pos = Character::posBetween(doc[idx - 1], doc[idx]);
    }

    doc.insert(doc.begin() + idx, Character(chr, self, pos));

    int len = (doc.begin() + idx)->characterToHeap(posArray_offset);
    return len;
}

int Document::insert_fromRemote(chr_t chr, usr_t usr, int len) {
    // first search the deletion backlog to see if a delete operation was received for the
    // Character before its insert operation
    Character toInsert = Character(chr, usr, posArray_offset, len);
    vector<Character>::iterator rmv = find(delBacklog.begin(), delBacklog.end(), toInsert);

    if (rmv != delBacklog.end()) {
        delBacklog.erase(rmv);

        return -1;
    }
    else {
        pair<bool, int> res = findCharIndex(toInsert);

        doc.insert(doc.begin() + res.second, toInsert);

        return res.second;
    }
}

int Document::delete_fromLocal(int idx) {
    vector<Character>::iterator toRemove = doc.begin() + idx;

    int len = toRemove->characterToHeap(posArray_offset);

    doc.erase(toRemove);

    return len;
}

int Document::delete_fromRemote(chr_t chr, usr_t usr, int len) {
    Character toRemove = Character(chr, usr, posArray_offset, len);
    pair<bool, int> res = findCharIndex(toRemove);

    if (res.first) {
        doc.erase(doc.begin() + res.second);

        return res.second;
    }
    else {
        delBacklog.push_back(toRemove);

        return -1;
    }
}

void Document::printDocument() const {
    cout << "--- Module WebAssembly ---" << endl;
    cout << "taille du document: " << doc.size() << endl;

    for (vector<Character>::const_iterator it = doc.cbegin(); it != doc.cend(); ++it) {
        cout << (*it) << endl;
    }
}

pair<bool, int> Document::findCharIndex(const Character& chr) {
    int low = 0;
    int high = (int)doc.size() - 1;

    while (low <= high) {
        int k = (low + high) >> 1;

        int compare = Character::poscmp(chr, doc[k]);

        if (compare == 1) {
            low = k + 1;
        }
        else if (compare == -1) {
            high = k - 1;
        }
        else {
            int usr_compare = Character::usrcmp(chr, doc[k]);

            if (usr_compare == 1) {
                low = k + 1;
            }
            else if (usr_compare == -1) {
                high = k - 1;
            }
            else {
                // the Character was found, return its index
                return pair<bool, size_t>(Character::chrcmp(chr, doc[k]), k);
            }
        }

    }

    // the correct insertion index was found
    return pair<bool, size_t>(false, high + 1);
}