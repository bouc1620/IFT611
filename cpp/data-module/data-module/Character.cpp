#include <vector>

#include "Character.h"

using namespace std;

const Character::pos_vector_t posFirst({ Character::POS_MID });




Character::chr_t Character::getChar() const {
    return chr;
}





Character::Character(chr_t chr, usr_t usr, pos_ptr_t pos, int len)
    : chr(chr), usr(usr), pos(pos, pos + len) {};

Character::Character(chr_t chr, usr_t usr, pos_vector_t pos)
    : chr(chr), usr(usr), pos(pos) {};

bool Character::operator!=(const Character& other) const {
    return !(*this == other);
}

bool Character::operator==(const Character& other) const {
    return chrcmp(*this, other) && usrcmp(*this, other) == 0 && poscmp(*this, other) == 0;
}

int Character::posToHeap(pos_ptr_t posArray_offset) const {

    // TODO: réallouer l'espace sur le tas si le vecteur de position à envoyer est trop
    //       grand et communiquer l'adresse de la nouvelle mémoire allouée à Document

    for (pos_vector_t::const_iterator it = pos.cbegin(); it != pos.cend(); ++it) {
        posArray_offset[it - pos.cbegin()] = *it;
    }

    return (int)pos.size();
}

bool Character::chrcmp(const Character& char1, const Character& char2) {
    return char1.chr == char2.chr;
}

int Character::usrcmp(const Character& char1, const Character& char2) {
    if (char1.usr > char2.usr) {
        return 1;
    }
    else if (char1.usr < char2.usr) {
        return -1;
    }

    return 0;
}

int Character::poscmp(const Character& char1, const Character& char2) {
    return poscmp(char1.pos, char2.pos);
}

int Character::poscmp(const pos_vector_t& pos1, const pos_vector_t& pos2) {
    for (int i = 0; i < min(pos1.size(), pos2.size()); ++i) {
        if (pos1[i] > pos2[i]) {
            return 1;
        }
        else if (pos1[i] < pos2[i]) {
            return -1;
        }
    }

    if (pos1.size() > pos2.size()) {
        return 1;
    }
    else if (pos1.size() < pos2.size()) {
        return -1;
    }

    return 0;
}

Character::pos_vector_t Character::posBefore(const Character& after) {
    pos_vector_t posBefore = pos_vector_t({ after.pos });

    if (posBefore.back() <= POS_MIN) {
        posBefore[posBefore.size() - 1] -= 1;
    }
    else {
        posBefore[posBefore.size() - 1] >>= 1;
    }

    return posBefore;
}

Character::pos_vector_t Character::posAfter(const Character& before) {
    pos_vector_t posAfter = pos_vector_t({ before.pos });

    if (posAfter.back() < POS_MIN) {
        posAfter[posAfter.size() - 1] += 1;
    }
    else if (posAfter.back() == POS_MAX) {
        posAfter.push_back(POS_MID);
    }
    else {
        posAfter[posAfter.size() - 1] <<= 1;
    }

    return posAfter;
}

Character::pos_vector_t Character::posBetween(const Character& before, const Character& after) {
    const pos_vector_t& posBefore = before.pos;
    const pos_vector_t& posAfter = after.pos;

    pos_vector_t posBetween = Character::posAfter(before);

    int compare = poscmp(posBetween, posAfter);

    if (compare == 0) {
        posBetween.push_back(POS_MID);
    }
    else if (compare == 1) {
        pos_vector_t temp = Character::posBefore(after);
        if (temp == posBetween) {
            posBetween.push_back(POS_MID);
        }
        else {
            posBetween = temp;
        }
    }

    return posBetween;
}