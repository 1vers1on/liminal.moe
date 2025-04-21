/* Copyright (C) 2025 Ellie Hartung

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

import { writable } from "svelte/store";
import type { UnicodeData, UnicodeCharacter } from "./types";

export const unicodeCharacters = writable<UnicodeData>({});
export const characterList = writable<string[]>([]);
export const coolChars = writable<Set<string>>(new Set());
export const declinedChars = writable<Set<string>>(new Set());
export const currentChar = writable<UnicodeCharacter | null>(null);
export const isDarkMode = writable<boolean>(true);
