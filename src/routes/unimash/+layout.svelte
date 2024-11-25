<script lang="ts">
    import { run } from 'svelte/legacy';

    import "$lib/unimash/app.css";
    import { onMount } from "svelte";
    import { isDarkMode } from "$lib/unimash/stores";
    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();

    onMount(() => {
        const savedTheme = localStorage.getItem("theme");
        isDarkMode.set(savedTheme !== "light");
    });

    run(() => {
        if (typeof window !== "undefined") {
            document.body.classList.toggle("light-mode", !$isDarkMode);
        }
    });
</script>

<div class="container">
    {@render children?.()}
</div>

<style>
</style>
