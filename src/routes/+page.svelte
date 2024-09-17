<script>
    import Mobile from "$lib/mobile.svelte";
    import Desktop from "$lib/desktop.svelte";
    let isMobile = false;
    let w;
    isMobile = isMobile || w < 768;
</script>
<svelte:window bind:innerWidth={w} />

{#if isMobile}
    <Mobile />
{:else}
    <Desktop />
{/if}
