/* Copyright (C) 2025 Eleanor Hartung

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>. */

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
