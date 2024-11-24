<script lang="ts">
    import { calculateProgress } from "$lib/unimash/utils";

    export let total: number;
    export let coolChars: Set<string>;
    export let declinedChars: Set<string>;

    $: progress = calculateProgress(total, coolChars, declinedChars);
</script>

<div class="progress-container">
    <div class="progress-bar" style="width: {progress.percentage}%"></div>
    <div class="progress-percentage">
        {progress.percentage.toFixed(2)}% ({progress.voted}/{total})
    </div>
</div>
