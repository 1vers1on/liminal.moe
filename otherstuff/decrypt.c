#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

void decryptVigenere(char* cipherText, char* key) {
    int textLen = strlen(cipherText);
    int keyLen = strlen(key);
    char plainText[textLen + 1];

    for (int i = 0, j = 0; i < textLen; i++) {
        if (isalpha(cipherText[i])) {
            char offset = isupper(cipherText[i]) ? 'A' : 'a';
            char k = isupper(key[j % keyLen]) ? (key[j % keyLen] - 'A') : (key[j % keyLen] - 'a');
            plainText[i] = (cipherText[i] - k - offset + 26) % 26 + offset;
            j++;
        } else {
            plainText[i] = cipherText[i];
        }
    }

    plainText[textLen] = '\0';
    printf("Decrypted Text: %s\n", plainText);
}

int main(int argc, char* argv[]) {
    if (argc != 3) {
        printf("Usage: %s <key> <filename>\n", argv[0]);
        return 1;
    }

    char* key = argv[1];
    char* filename = argv[2];

    FILE *file = fopen(filename, "r");
    if (file == NULL) {
        perror("Error opening file");
        return 1;
    }

    fseek(file, 0, SEEK_END);
    long fileSize = ftell(file);
    fseek(file, 0, SEEK_SET);

    char *cipherText = (char*)malloc(fileSize + 1);
    if (cipherText == NULL) {
        perror("Memory allocation error");
        fclose(file);
        return 1;
    }

    fread(cipherText, 1, fileSize, file);
    cipherText[fileSize] = '\0';

    fclose(file);

    decryptVigenere(cipherText, key);

    free(cipherText);

    return 0;
}
