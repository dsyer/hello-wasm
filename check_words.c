#include <stdlib.h>
#include <stdio.h>
#include <check.h>

#include "words.c"

Word *word;

void setup(void)
{
	word = malloc(sizeof(Word *));
	word->word = "foo";
	word->score = 123;
	word->common = true;
}

void teardown(void)
{
	free(word);
}

START_TEST(test_words)
{
	if (!word->common)
	{
		ck_abort_msg("Word should be common");
	}
}
END_TEST

Suite *words_suite(void)
{
	Suite *s;
	TCase *tc_core;
	TCase *tc_limits;

	s = suite_create("Words");

	/* Core test case */
	tc_core = tcase_create("Core");

	tcase_add_checked_fixture(tc_core, setup, teardown);
	tcase_add_test(tc_core, test_words);
	suite_add_tcase(s, tc_core);

	return s;
}

/*
 * $ gcc -o test -l check check_words.c
 * $ ./test
 * Running suite(s): Words
 * 0%: Checks: 1, Failures: 1, Errors: 0
 */
int main(void)
{
	int number_failed;
	Suite *s;
	SRunner *sr;

	s = words_suite();
	sr = srunner_create(s);

	srunner_run_all(sr, CK_NORMAL);
	number_failed = srunner_ntests_failed(sr);
	srunner_free(sr);
	return (number_failed == 0) ? EXIT_SUCCESS : EXIT_FAILURE;
}