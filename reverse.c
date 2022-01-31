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
	char *result = calloc(sizeof(char), size+1);
	result = "Hello ";
	strcat(result, plaintext);
	result[size] = 0; // null terminate
	return result;
}