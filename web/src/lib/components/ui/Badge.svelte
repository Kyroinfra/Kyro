<script lang="ts">
	interface Props {
		variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
		size?: 'sm' | 'md';
		children: import('svelte').Snippet;
	}

	let {
		variant = 'default',
		size = 'sm',
		children
	}: Props = $props();
</script>

<span class="badge badge-{variant} badge-{size}">
	{@render children()}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		font-family: var(--font-mono);
		font-weight: 500;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		white-space: nowrap;
	}

	.badge-sm {
		padding: 2px 6px;
		font-size: var(--font-size-xs);
	}

	.badge-md {
		padding: 4px 8px;
		font-size: var(--font-size-sm);
	}

	.badge-default {
		background: transparent;
		color: var(--color-text-muted);
		border-color: var(--color-border);
	}

	.badge-success {
		background: transparent;
		color: var(--color-success);
		border-color: var(--color-success);
	}

	.badge-warning {
		background: transparent;
		color: var(--color-warning);
		border-color: var(--color-warning);
	}

	.badge-danger {
		background: transparent;
		color: var(--color-danger);
		border-color: var(--color-danger);
	}

	.badge-info {
		background: transparent;
		color: var(--color-text);
		border-color: var(--color-border);
	}
</style>