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

int main() {
	time_t t;
	srand((unsigned) time(&t));
	printf("%s\n", "Starting...");
	return 0;
}