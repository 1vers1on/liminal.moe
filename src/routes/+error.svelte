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
