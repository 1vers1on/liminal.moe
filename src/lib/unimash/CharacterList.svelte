<script lang="ts">
    import { CHARS_PER_PAGE } from "$lib/unimash/utils";

    interface Props {
        title: string;
        characters: string[];
        onClose: () => void;
        onRemove: (char: string) => void;
    }

    let { title, characters, onClose, onRemove }: Props = $props();

    let currentPage = $state(1);

    let sortedChars = $derived([...characters].sort());
    let totalPages = $derived(Math.ceil(characters.length / CHARS_PER_PAGE));
    let pageChars = $derived(
        sortedChars.slice(
            (currentPage - 1) * CHARS_PER_PAGE,
            currentPage * CHARS_PER_PAGE,
        ),
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
                    onclick={() => onRemove(char)}
                >
                    {char}
                </button>
            {/each}
        </div>
        <div class="pagination">
            <button onclick={prevPage} disabled={currentPage === 1}>
                Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button onclick={nextPage} disabled={currentPage === totalPages}>
                Next
            </button>
        </div>
        <button class="close-popup" onclick={onClose}> Close </button>
    </div>
</div>
