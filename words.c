#include <stdbool.h>

struct word {
	char* word;
	int score;
	bool common;
};

typedef struct word Word;

Word words[] = {
	{
		"four",
		4,
		true
	},
	{
		"pink",
		7,
		false
	},
	{
		"rats",
		123,
		true
	}
};

Word* list() {
	return words;
}

int size() {
	// 12
	return sizeof(Word);
}