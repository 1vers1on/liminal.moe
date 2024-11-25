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
