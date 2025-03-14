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
