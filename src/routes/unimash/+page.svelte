<script lang="ts">
    import { onMount } from "svelte";
    import {
        unicodeCharacters,
        characterList,
        coolChars,
        declinedChars,
        currentChar,
        isDarkMode,
    } from "$lib/unimash/stores";
    import {
        getRandomUnvotedCharacter,
        calculateProgress,
        CHARS_PER_PAGE,
    } from "$lib/unimash/utils";
    import ThemeToggle from "$lib/unimash/ThemeToggle.svelte";
    import ProgressBar from "$lib/unimash/ProgressBar.svelte";
    import VotingSection from "$lib/unimash/VotingSection.svelte";
    import CharacterList from "$lib/unimash/CharacterList.svelte";

    let selectedPopupVisible = $state(false);
    let declinedPopupVisible = $state(false);

    onMount(async () => {
        const response = await fetch("/unicode-characters.json");
        const data = await response.json();
        unicodeCharacters.set(data);
        characterList.set(Object.keys(data));

        const storedCool = JSON.parse(
            localStorage.getItem("coolChars") || "[]",
        );
        const storedDeclined = JSON.parse(
            localStorage.getItem("declinedChars") || "[]",
        );

        coolChars.set(new Set(storedCool));
        declinedChars.set(new Set(storedDeclined));

        updateCurrentChar();
    });

    function updateCurrentChar() {
        const char = getRandomUnvotedCharacter(
            $characterList,
            $unicodeCharacters,
            $coolChars,
            $declinedChars,
        );
        currentChar.set(char);
    }

    function handleVote(isPositive: boolean) {
        if (!$currentChar) return;

        const char = String.fromCodePoint(parseInt($currentChar.code, 16));
        if (isPositive) {
            coolChars.update((set) => {
                set.add(char);
                localStorage.setItem("coolChars", JSON.stringify([...set]));
                return set;
            });
        } else {
            declinedChars.update((set) => {
                set.add(char);
                localStorage.setItem("declinedChars", JSON.stringify([...set]));
                return set;
            });
        }

        updateCurrentChar();
    }

    function clearAllSelections() {
        coolChars.set(new Set());
        declinedChars.set(new Set());
        localStorage.setItem("coolChars", "[]");
        localStorage.setItem("declinedChars", "[]");
        selectedPopupVisible = false;
        declinedPopupVisible = false;
        updateCurrentChar();
    }

    function handleKeyPress(event: KeyboardEvent) {
        if (event.key.toLowerCase() === "a") handleVote(true);
        else if (event.key.toLowerCase() === "s") handleVote(false);
    }
</script>

<svelte:window onkeydown={handleKeyPress} />

<h1>Unicode Smash or Pass</h1>

<ThemeToggle />

<ProgressBar
    total={$characterList.length}
    coolChars={$coolChars}
    declinedChars={$declinedChars}
/>

<VotingSection character={$currentChar} onVote={handleVote} />

<div class="character-list-buttons">
    <button class="list-button" onclick={() => (selectedPopupVisible = true)}>
        Show Smashed Characters
    </button>
    <button class="list-button" onclick={() => (declinedPopupVisible = true)}>
        Show Passed Characters
    </button>
</div>

<button class="clear-button" onclick={clearAllSelections}>
    Clear All Selections
</button>

{#if selectedPopupVisible}
    <CharacterList
        title="Smashed Characters"
        characters={[...$coolChars]}
        onClose={() => (selectedPopupVisible = false)}
        onRemove={(char: string) => {
            coolChars.update((set) => {
                set.delete(char);
                localStorage.setItem("coolChars", JSON.stringify([...set]));
                return set;
            });
        }}
    />
{/if}

{#if declinedPopupVisible}
    <CharacterList
        title="Passed Characters"
        characters={[...$declinedChars]}
        onClose={() => (declinedPopupVisible = false)}
        onRemove={(char: string) => {
            declinedChars.update((set) => {
                set.delete(char);
                localStorage.setItem("declinedChars", JSON.stringify([...set]));
                return set;
            });
        }}
    />
{/if}
