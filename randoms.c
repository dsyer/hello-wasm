#include <stdio.h>
#include <stdlib.h>
#include <time.h>

void printit()
{
	for (int i = 0; i < 5; i++)
	{
		printf("%f\n", rand()/(float)RAND_MAX);
	}
}

void init() {
	time_t t;
	srand((unsigned) time(&t));
	printf("%s\n", "Starting...");
}

int main() {
	init();
	return 0;
}