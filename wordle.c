#include <stdlib.h>
#include <time.h>
#include <string.h>

#include "wordle.h"

int WORD_COUNT;

char *word;

int letters[26] = {};

void solution(char *value, int length)
{
	for (int i = 0; i < length && i < 5; i++)
	{
		value[i] = word[i];
	}
}

int compare(const void *s1, const void *s2)
{
	const char *key = s1;
	const char *const *arg = s2;
	return strcmp(key, *arg);
}

int validate(char *value, int length)
{
	if (length > 5)
	{
		return 0;
	}
	return bsearch(value, words, WORD_COUNT, sizeof(char *), compare) != NULL;
}

void count() {
	for (int i = 0; i < 5; i++)
	{
		int index = word[i] - 'a';
		letters[index]++;
	}
}

void reset(char *value, int length)
{
	if (length > 5)
	{
		return;
	}
	char **result = bsearch(value, words, WORD_COUNT, sizeof(char *), compare);
	if (result != NULL)
	{
		word = *result;
		count();
	}
}

void guess(char *guess, int length)
{
	int counts[26] = {};
	for (int i = 0; i < length; i++)
	{
		int index = guess[i] - 'a';
		if (index >= 0 && index < 26)
		{
			counts[index]++;
		}
	}
	for (int i = 0; i < length && i < 5; i++)
	{
		if (word[i] == guess[i])
		{
			guess[i] = 4; // hit
		}
	}
	for (int i = 0; i < length; i++)
	{
		if (guess[i] > 4)
		{
			int index = guess[i] - 'a';
			for (int j = 0; j < 5; j++)
			{
				if (word[j] == guess[i] && j != i && counts[index] <= letters[index])
				{
					guess[i] = 2; // miss
				}
			}
		}
		if (guess[i] > 4)
		{
			guess[i] = 1; // wrong
		}
	}
}

int main()
{
	time_t t = time(NULL);
	srand((unsigned)t);
	WORD_COUNT = sizeof(words) / sizeof(*words);
	word = words[(int)(WORD_COUNT * (rand() / (float)RAND_MAX))];
	count();
	return 0;
}