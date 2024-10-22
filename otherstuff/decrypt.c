#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

// Function to decrypt Vigenère cipher
void decryptVigenere(char* cipherText, char* key) {
    int textLen = strlen(cipherText);
    int keyLen = strlen(key);
    char plainText[textLen + 1]; // Create a buffer for the decrypted text

    for (int i = 0, j = 0; i < textLen; i++) {
        if (isalpha(cipherText[i])) {
            char offset = isupper(cipherText[i]) ? 'A' : 'a';
            char k = isupper(key[j % keyLen]) ? (key[j % keyLen] - 'A') : (key[j % keyLen] - 'a');
            plainText[i] = (cipherText[i] - k - offset + 26) % 26 + offset;
            j++;
        } else {
            plainText[i] = cipherText[i]; // Non-alphabet characters remain unchanged
        }
    }

    plainText[textLen] = '\0'; // Null-terminate the decrypted string
    printf("Decrypted Text: %s\n", plainText);
}

int main(int argc, char* argv[]) {
    if (argc != 3) {
        printf("Usage: %s <key> <filename>\n", argv[0]);
        return 1;
    }

    char* key = argv[1];
    char* filename = argv[2];

    // Open the file for reading
    FILE *file = fopen(filename, "r");
    if (file == NULL) {
        perror("Error opening file");
        return 1;
    }

    // Find the file size
    fseek(file, 0, SEEK_END);
    long fileSize = ftell(file);
    fseek(file, 0, SEEK_SET);

    // Allocate memory to read the file content
    char *cipherText = (char*)malloc(fileSize + 1);
    if (cipherText == NULL) {
        perror("Memory allocation error");
        fclose(file);
        return 1;
    }

    // Read the file content
    fread(cipherText, 1, fileSize, file);
    cipherText[fileSize] = '\0'; // Null-terminate the cipher text

    fclose(file);

    // Decrypt the file content
    decryptVigenere(cipherText, key);

    // Free allocated memory
    free(cipherText);

    return 0;
}
