<script lang="ts">
    // import { onMount } from "svelte";
    // import { fly, fade } from "svelte/transition";
    import Desktop from "$lib/desktop.svelte";
    // import { isMobile } from "$lib/mobile";

    // let mobile = $state(false);
    // let tiltX = $state(0);
    // let tiltY = $state(0);

    // onMount(() => {
    //     mobile = isMobile();
    //     if (window.DeviceOrientationEvent) {
    //         window.addEventListener("deviceorientation", (event) => {
    //             tiltX = event.beta
    //                 ? Math.min(Math.max(event.beta * 0.5, -15), 15)
    //                 : 0;
    //             tiltY = event.gamma
    //                 ? Math.min(Math.max(event.gamma * 0.5, -15), 15)
    //                 : 0;
    //         });
    //     }
    // });
</script>

<!-- {#if mobile}
    <div
        class="mobile-container"
        transition:fade
        style="--tiltX: {tiltX}deg; --tiltY: {tiltY}deg;"
    >
        <div class="content-wrapper">
            <h1 class="fancy-title">Welcome, Traveler!</h1>
            <p class="fancy-msg">
                this site is optimized for desktop, but since you're here, take
                a moment to soak in the vibes. ✨
            </p>
        </div>
    </div>
{:else} -->
<Desktop />
<!-- {/if} -->

<!-- <style>
    .mobile-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        max-height: 100vh;
        background: radial-gradient(
            circle at top right,
            #ffb6c1,
            #ff9a9e,
            #fad0c4
        );
        text-align: center;
        padding: 2rem;
        box-sizing: border-box;
        perspective: 1000px;
        overflow: hidden;
        animation:
            pulse 4s infinite ease-in-out,
            colorShift 5s infinite;
    }

    .content-wrapper {
        transform-style: preserve-3d;
        transform: rotateX(var(--tiltX)) rotateY(var(--tiltY));
        transition: transform 0.3s ease-out;
        will-change: transform;
        width: 100%;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    @keyframes pulse {
        0%,
        100% {
            transform: scale(1) translateZ(0);
        }
        50% {
            transform: scale(1.05) translateZ(50px);
        }
    }

    @keyframes colorShift {
        0% {
            filter: hue-rotate(0deg);
        }
        50% {
            filter: hue-rotate(180deg);
        }
        100% {
            filter: hue-rotate(360deg);
        }
    }

    .fancy-title {
        font-size: 3rem;
        color: #ffffff;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 1.5rem;
        letter-spacing: 2px;
        text-shadow:
            2px 2px 8px rgba(0, 0, 0, 0.3),
            4px 4px 16px rgba(0, 0, 0, 0.2);
        transform: translateZ(50px);
        transition: transform 0.3s ease-out;
    }

    .fancy-msg {
        font-size: 1.5rem;
        color: #f0f0f0;
        margin: 0 auto 3rem auto;
        max-width: 80%;
        line-height: 1.5;
        letter-spacing: 1px;
        animation: fadeIn 1s ease-in-out;
        text-shadow:
            1px 1px 4px rgba(0, 0, 0, 0.2),
            2px 2px 8px rgba(0, 0, 0, 0.1);
        transform: translateZ(30px);
        transition: transform 0.3s ease-out;
        text-align: center;
    }

    @keyframes fadeIn {
        0% {
            opacity: 0;
            transform: translateZ(0);
        }
        100% {
            opacity: 1;
            transform: translateZ(30px);
        }
    }
</style> -->
