<!-- Copyright (C) 2025 Ellie Hartung

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
    import { calculateProgress } from "$lib/unimash/utils";

    interface Props {
        total: number;
        coolChars: Set<string>;
        declinedChars: Set<string>;
    }

    let { total, coolChars, declinedChars }: Props = $props();

    let progress = $derived(calculateProgress(total, coolChars, declinedChars));
</script>

<div class="progress-container">
    <div class="progress-bar" style="width: {progress.percentage}%"></div>
    <div class="progress-percentage">
        {progress.percentage.toFixed(2)}% ({progress.voted}/{total})
    </div>
</div>
