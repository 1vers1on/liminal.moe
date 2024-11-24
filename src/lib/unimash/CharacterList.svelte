<script lang="ts">
    import { CHARS_PER_PAGE } from "$lib/unimash/utils";

    export let title: string;
    export let characters: string[];
    export let onClose: () => void;
    export let onRemove: (char: string) => void;

    let currentPage = 1;

    $: sortedChars = [...characters].sort();
    $: totalPages = Math.ceil(characters.length / CHARS_PER_PAGE);
    $: pageChars = sortedChars.slice(
        (currentPage - 1) * CHARS_PER_PAGE,
        currentPage * CHARS_PER_PAGE,
    );

    function prevPage() {
        if (currentPage > 1) currentPage--;
    }

    function nextPage() {
        if (currentPage < totalPages) currentPage++;
    }
</script>

<div class="character-popup">
    <div class="popup-content">
        <h2>{title}</h2>
        <div class="character-grid">
            {#each pageChars as char}
                <button
                    class={title === "Smashed Characters"
                        ? "selected-char"
                        : "declined-char"}
                    on:click={() => onRemove(char)}
                >
                    {char}
                </button>
            {/each}
        </div>
        <div class="pagination">
            <button on:click={prevPage} disabled={currentPage === 1}>
                Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button on:click={nextPage} disabled={currentPage === totalPages}>
                Next
            </button>
        </div>
        <button class="close-popup" on:click={onClose}> Close </button>
    </div>
</div>
