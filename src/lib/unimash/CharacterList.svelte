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
