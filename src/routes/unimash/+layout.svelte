<script lang="ts">
    import "$lib/unimash/app.css";
    import { onMount } from "svelte";
    import { isDarkMode } from "$lib/unimash/stores";

    onMount(() => {
        const savedTheme = localStorage.getItem("theme");
        isDarkMode.set(savedTheme !== "light");
    });

    $: if (typeof window !== "undefined") {
        document.body.classList.toggle("light-mode", !$isDarkMode);
    }
</script>

<div class="container">
    <slot />
</div>

<style>
</style>
