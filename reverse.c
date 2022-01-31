#include <stdlib.h>
#include <string.h>

void reverse(char *plaintext, int length)
{
	for (int i = 0; i < length / 2; i++)
	{
		char value = plaintext[i];
		plaintext[i] = plaintext[length - i - 1];
		plaintext[length - i - 1] = value;
	}
}

char *greet(char *plaintext, int length)
{
	int size = length + 6;
	char *result = calloc(sizeof(char), size + 1);
	strcpy(result, "Hello ");
	strcat(result, plaintext);
	return result;
}

int compare(const void *s1, const void *s2)
{
	const char *key = s1;
	const char *const *arg = s2;
	return strcmp(key, *arg);
}

char EMPTY[] = {};

char *find(char *value, char **strings, int length) {
	char **result = bsearch(value, strings, length, sizeof(char *), compare);
	return result != NULL ? *result : EMPTY;
}

char *words[] = {
	"four",
	"pink",
	"rats"
};

char **list() {
	return words;
}