#include <stdlib.h>
#include <stdio.h>
#include <check.h>

#define main wordle_main
#include "wordle.c"
#undef main

Word value;

void setup(void)
{
	wordle_main();
	value.word = "spate";
	value.common = true;
}

void teardown(void)
{
}

START_TEST(test_words)
{
	for (int i = 0; i < 100; i++)
	{
		if (!validate(word, strlen(word)))
		{
			ck_abort_msg("Word %s should be common", value.word);
		}
		wordle_main();
	}
}
END_TEST

START_TEST(test_validate)
{
	if (!validate(word, strlen(word)))
	{
		ck_abort_msg("Word %s should be valid", word);
	}
}
END_TEST

START_TEST(test_solution)
{
	char invalid[] = "aabbc";
	solution(invalid, 5);
	if (strcmp(word, invalid) != 0)
	{
		ck_abort_msg("Words %s and %s should be same", word, invalid);
	}
}
END_TEST

START_TEST(test_reset_invalid)
{
	char *old = word;
	char invalid[] = "aabbc";
	reset(invalid, 5);
	if (strlen(word) != 5)
	{
		ck_abort_msg("Word %s should still be 5 letters", word);
	}
	if (strcmp(word, old) != 0)
	{
		ck_abort_msg("Words %s and %s should not change", word, old);
	}
	if (strcmp(word, invalid) == 0)
	{
		ck_abort_msg("Words %s and %s should not be same", word, invalid);
	}
}
END_TEST

START_TEST(test_reset_successful)
{
	// Use a constant that is longer than the one in words, or it will end up being re-used by the compiler
	char *valid = strdup("store");
	reset(valid, 5);
	if (strlen(word) != 5)
	{
		ck_abort_msg("Word %s should be 5 letters", word);
	}
	if (word == valid)
	{
		ck_abort_msg("Word pointers %lu and %lu should not be same after reset",
					 (unsigned long)word, (unsigned long)valid);
	}
	if (strcmp(word, "store")!=0)
	{
		ck_abort_msg("Words %s and %s should be same", word, "store");
	}
	if (!validate(word, strlen(word)))
	{
		ck_abort_msg("Word %s should be valid", word);
	}
	free(valid);
}
END_TEST

START_TEST(test_guess_correct)
{
	reset(value.word, strlen(value.word));
	char *result = strdup(value.word);
	guess(result, strlen(result));
	if (memcmp(result, word, strlen(word)) == 0)
	{
		ck_abort_msg("Word %s should be transformed", word);
	}
	char all[] = {4, 4, 4, 4, 4};
	if (memcmp(result, all, sizeof(all)) != 0)
	{
		ck_abort_msg("Wrong scores for %s: [%d, %d, %d, %d, %d]",
					 word, result[0], result[1], result[2], result[3], result[4]);
	}
	free(result);
}
END_TEST

START_TEST(test_guess_anagram)
{
	reset(value.word, strlen(value.word));
	char *result = strdup("tapes");
	guess(result, strlen(result));
	char all[] = {2, 2, 2, 2, 2};
	if (memcmp(result, all, sizeof(all)) != 0)
	{
		ck_abort_msg("Wrong scores for %s: [%d, %d, %d, %d, %d]",
					 word, result[0], result[1], result[2], result[3], result[4]);
	}
	free(result);
}
END_TEST

START_TEST(test_guess_all_miss)
{
	reset(value.word, strlen(value.word));
	char *result = strdup("droid");
	guess(result, strlen(result));
	char all[] = {1, 1, 1, 1, 1};
	if (memcmp(result, all, sizeof(all)) != 0)
	{
		ck_abort_msg("Wrong scores for %s: [%d, %d, %d, %d, %d]",
					 word, result[0], result[1], result[2], result[3], result[4]);
	}
	free(result);
}
END_TEST

START_TEST(test_guess_double_letter_miss_hit)
{
	reset(value.word, strlen(value.word));
	char *result = strdup("petty");
	guess(result, strlen(result));
	char all[] = {2, 2, 1, 4, 1};
	if (memcmp(result, all, sizeof(all)) != 0)
	{
		ck_abort_msg("Wrong scores for %s: [%d, %d, %d, %d, %d]",
					 word, result[0], result[1], result[2], result[3], result[4]);
	}
	free(result);
}
END_TEST

START_TEST(test_guess_double_letter_hit_miss)
{
	reset(value.word, strlen(value.word));
	char *result = strdup("pratt");
	guess(result, strlen(result));
	char all[] = {2, 1, 4, 4, 1};
	if (memcmp(result, all, sizeof(all)) != 0)
	{
		ck_abort_msg("Wrong scores for %s: [%d, %d, %d, %d, %d]",
					 word, result[0], result[1], result[2], result[3], result[4]);
	}
	free(result);
}
END_TEST

START_TEST(test_guess_single)
{
	reset(value.word, strlen(value.word));
	char *result = strdup("p");
	guess(result, strlen(result));
	char all[] = {2};
	if (memcmp(result, all, sizeof(all)) != 0)
	{
		ck_abort_msg("Wrong scores for %s: [%d]",
					 word, result[0]);
	}
	free(result);
}
END_TEST

Suite *wordle_suite(void)
{
	Suite *s;
	TCase *tc_core;
	TCase *tc_limits;

	s = suite_create("Words");

	/* Core test case */
	tc_core = tcase_create("Core");

	tcase_add_checked_fixture(tc_core, setup, teardown);
	tcase_add_test(tc_core, test_words);
	tcase_add_test(tc_core, test_validate);
	tcase_add_test(tc_core, test_solution);
	tcase_add_test(tc_core, test_reset_invalid);
	tcase_add_test(tc_core, test_reset_successful);
	tcase_add_test(tc_core, test_guess_correct);
	tcase_add_test(tc_core, test_guess_anagram);
	tcase_add_test(tc_core, test_guess_all_miss);
	tcase_add_test(tc_core, test_guess_double_letter_miss_hit);
	tcase_add_test(tc_core, test_guess_double_letter_hit_miss);
	tcase_add_test(tc_core, test_guess_single);
	suite_add_tcase(s, tc_core);

	return s;
}

/*
 * $ gcc -o test -l check check_wordle.c
 * $ ./test
 */
int main(void)
{
	int number_failed;
	Suite *s;
	SRunner *sr;

	s = wordle_suite();
	sr = srunner_create(s);

	srunner_run_all(sr, CK_NORMAL);
	number_failed = srunner_ntests_failed(sr);
	srunner_free(sr);
	return (number_failed == 0) ? EXIT_SUCCESS : EXIT_FAILURE;
}