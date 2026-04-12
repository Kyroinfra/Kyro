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
		border: 1px solid;
		border-radius: var(--radius-sm);
		white-space: nowrap;
		letter-spacing: 0.3px;
		text-transform: uppercase;
	}

	.badge-sm {
		padding: 1px 5px;
		font-size: var(--font-size-2xs);
	}

	.badge-md {
		padding: 3px 7px;
		font-size: var(--font-size-xs);
	}

	.badge-default {
		background: var(--color-bg-3);
		color: var(--color-text-muted);
		border-color: var(--color-border-2);
	}

	.badge-success {
		background: var(--color-success-dim);
		color: var(--color-success);
		border-color: var(--color-success-border);
	}

	.badge-warning {
		background: var(--color-warning-dim);
		color: var(--color-warning);
		border-color: var(--color-warning-border);
	}

	.badge-danger {
		background: var(--color-danger-dim);
		color: var(--color-danger);
		border-color: var(--color-danger-border);
	}

	.badge-info {
		background: var(--color-bg-3);
		color: var(--color-text-dim);
		border-color: var(--color-border-2);
	}
</style>
