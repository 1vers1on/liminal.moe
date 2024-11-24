import { writable } from "svelte/store";
import type { UnicodeData, UnicodeCharacter } from "./types";

export const unicodeCharacters = writable<UnicodeData>({});
export const characterList = writable<string[]>([]);
export const coolChars = writable<Set<string>>(new Set());
export const declinedChars = writable<Set<string>>(new Set());
export const currentChar = writable<UnicodeCharacter | null>(null);
export const isDarkMode = writable<boolean>(true);
