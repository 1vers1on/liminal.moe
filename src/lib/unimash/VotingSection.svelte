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
