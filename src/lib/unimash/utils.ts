import type { UnicodeData } from "./types";

export const CHARS_PER_PAGE = 200;

export function getRandomUnvotedCharacter(
    characterList: string[],
    unicodeCharacters: UnicodeData,
    coolChars: Set<string>,
    declinedChars: Set<string>,
): { code: string; name: string } | null {
    const unvotedChars = characterList.filter((charCode) => {
        const char = String.fromCodePoint(parseInt(charCode, 16));
        return !coolChars.has(char) && !declinedChars.has(char);
    });

    if (unvotedChars.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * unvotedChars.length);
    const charCode = unvotedChars[randomIndex];

    return {
        code: charCode,
        name: unicodeCharacters[charCode],
    };
}

export function calculateProgress(
    total: number,
    coolChars: Set<string>,
    declinedChars: Set<string>,
): { percentage: number; voted: number } {
    const voted = coolChars.size + declinedChars.size;
    return {
        percentage: (voted / total) * 100,
        voted,
    };
}
