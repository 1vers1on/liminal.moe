<script>
    import MobileChat from "$lib/mobileChat.svelte";
    import DesktopChat from "$lib/desktopChat.svelte";
    let isMobile = false;
    let w;
    isMobile = isMobile || w < 768;
</script>
<svelte:window bind:innerWidth={w} />

{#if isMobile}
    <DesktopChat />
{:else}
    <DesktopChat />
{/if}
