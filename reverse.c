void reverse(char *plaintext, int length)
{
	for (int i = 0; i < length/2; i++)
	{
		char value = plaintext[i];
		plaintext[i] = plaintext[length - i - 1];
		plaintext[length - i - 1] = value;
	}
}
