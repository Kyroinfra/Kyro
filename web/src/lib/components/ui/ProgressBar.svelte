<script lang="ts">
	interface Props {
		value: number;
		max?: number;
		showLabel?: boolean;
		size?: 'sm' | 'md' | 'lg';
	}

	let { value = 0, max = 100, showLabel = false, size = 'md' }: Props = $props();

	const pct = $derived(Math.min(100, Math.max(0, (value / max) * 100)));
</script>

<div class="progress-wrapper progress-{size}">
	<div class="progress-track">
		<div class="progress-fill" style="width: {pct}%"></div>
	</div>
	{#if showLabel}
		<span class="progress-label">{Math.round(pct)}%</span>
	{/if}
</div>

<style>
	.progress-wrapper {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.progress-track {
		flex: 1;
		background: var(--color-bg-3);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.progress-sm .progress-track {
		height: 4px;
	}

	.progress-md .progress-track {
		height: 8px;
	}

	.progress-lg .progress-track {
		height: 12px;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-accent);
		border-radius: var(--radius-full);
		transition: width 0.2s ease;
	}

	.progress-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		min-width: 40px;
		text-align: right;
	}
</style>
