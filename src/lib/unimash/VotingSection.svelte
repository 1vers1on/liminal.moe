<script lang="ts">
    import type { UnicodeCharacter } from "$lib/unimash/types";

    export let character: UnicodeCharacter | null;
    export let onVote: (isPositive: boolean) => void;
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
            on:click={() => onVote(true)}
        >
            👍 Smash
        </button>
        <button
            class="vote-button"
            id="voteNegative"
            on:click={() => onVote(false)}
        >
            👎 Pass
        </button>
    </div>
</div>
