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
    import { run } from "svelte/legacy";

    import "$lib/unimash/app.css";
    import { onMount } from "svelte";
    import { isDarkMode } from "$lib/unimash/stores";
    interface Props {
        children?: import("svelte").Snippet;
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
