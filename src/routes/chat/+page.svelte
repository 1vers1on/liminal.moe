<script>
    import Mobile from "$lib/mobile.svelte";
    import DesktopChat from "$lib/desktopChat.svelte";
    let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let w;
    isMobile = isMobile || w < 768;
</script>
<svelte:window bind:innerWidth={w} />

{#if isMobile}
    <Mobile />
{:else}
    <DesktopChat />
{/if}
