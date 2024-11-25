<script lang="ts">
    import { isDarkMode } from "$lib/unimash/stores";

    function toggleTheme() {
        isDarkMode.update((current) => {
            const newValue = !current;
            localStorage.setItem("theme", newValue ? "dark" : "light");
            return newValue;
        });
    }
</script>

<div class="theme-toggle">
    <label class="switch">
        <input type="checkbox" checked={!$isDarkMode} onchange={toggleTheme} />
        <span class="slider round"></span>
    </label>
    <span>{$isDarkMode ? "Light Mode" : "Dark Mode"}</span>
</div>
