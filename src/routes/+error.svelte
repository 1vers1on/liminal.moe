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
    import { page } from "$app/stores";
    import { onMount } from "svelte";

    let terminalOutput: string[] = $state([]);

    function printTypewriter(text: string, delay = 10) {
        return new Promise(async (resolve) => {
            let line = terminalOutput.length;
            for (let i = 0; i < text.length; i++) {
                terminalOutput[line] = (terminalOutput[line] || "") + text[i];
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
            resolve(undefined);
        });
    }

    onMount(async () => {
        await printTypewriter(
            `Error ${$page.status} - ${$page.error?.message}\n`,
        );
        await printTypewriter("Please check the URL and try again.\n");
        await printTypewriter(
            "If you believe this is an error, please contact the site administrator.\n",
        );
    });
</script>

<div class="terminal">
    {#each terminalOutput as line, i}
        <div class="terminal-line">{@html line}</div>
    {/each}
</div>

<style>
    .terminal {
        background-color: #000;
        color: #23d18b;
        padding: 10px;
        height: calc(100vh - 20px);
        overflow-y: auto;
    }

    .terminal::-webkit-scrollbar {
        display: none;
    }

    .terminal-line {
        word-break: break-all;
        white-space: pre;
    }
</style>
