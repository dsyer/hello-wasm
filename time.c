#include <time.h>
#include <stdio.h>
int main() {
time_t t = time(0);
printf("time: %ld\n", t);
}