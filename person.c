#include <stdio.h>
#include <stdlib.h>
#include "person.pb-c.h"

Person *juergen() {
	Person *person = malloc(sizeof(Person));
	person__init(person);
	person->id = "54321";
	person->name = "Juergen";
	return person;
}

int size(Person *person) {
	return person__get_packed_size(person);
}

void print(Person *person) {
	printf("addr=%lu (packed=%d, pointer=%lu, unpacked=%lu) id@%u='%s' name@%u='%s'\n", 
		(long) person, size(person), sizeof(person), sizeof(*person), (unsigned int)person->id, person->id, (unsigned int)person->name, person->name);
}

void pack(Person *person, uint8_t *out) {
	person__pack(person, out);
}

Person *unpack(uint8_t *data, int len) {
	return person__unpack(NULL, len, data);
}

int main() {
	print(juergen());
	return 0;
}