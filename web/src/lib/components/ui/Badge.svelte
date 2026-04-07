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
		font-weight: 500;
		border-radius: var(--radius-full);
		white-space: nowrap;
	}

	.badge-sm {
		height: 20px;
		padding: 0 var(--space-2);
		font-size: var(--font-size-xs);
	}

	.badge-md {
		height: 24px;
		padding: 0 var(--space-3);
		font-size: var(--font-size-sm);
	}

	.badge-default {
		background: var(--color-bg-3);
		color: var(--color-text-muted);
	}

	.badge-success {
		background: rgba(34, 197, 94, 0.15);
		color: var(--color-success);
	}

	.badge-warning {
		background: rgba(245, 158, 11, 0.15);
		color: var(--color-warning);
	}

	.badge-danger {
		background: rgba(239, 68, 68, 0.15);
		color: var(--color-danger);
	}

	.badge-info {
		background: rgba(99, 102, 241, 0.15);
		color: var(--color-accent);
	}
</style>
