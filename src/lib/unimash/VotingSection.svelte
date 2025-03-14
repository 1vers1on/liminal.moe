<!-- Copyright (C) 2025 Eleanor Hartung

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>. -->

<script lang="ts">
    import type { UnicodeCharacter } from "$lib/unimash/types";

    interface Props {
        character: UnicodeCharacter | null;
        onVote: (isPositive: boolean) => void;
    }

    let { character, onVote }: Props = $props();
</script>

<div id="votingMode">
    <div id="bigCharacter">
        {#if character}
            {String.fromCodePoint(parseInt(character.code, 16))}
        {:else}
            All characters voted!
        {/if}
    </div>
    <div id="characterName">
        {character?.name || ""}
    </div>
    <div class="voting-buttons">
        <button
            class="vote-button"
            id="votePositive"
            onclick={() => onVote(true)}
        >
            👍 Smash
        </button>
        <button
            class="vote-button"
            id="voteNegative"
            onclick={() => onVote(false)}
        >
            👎 Pass
        </button>
    </div>
</div>
