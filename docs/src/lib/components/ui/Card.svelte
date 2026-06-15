<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'default' | 'bordered' | 'flat';
		padding?: 'none' | 'sm' | 'md' | 'lg';
		children: Snippet;
	}

	let {
		variant = 'default',
		padding = 'md',
		children
	}: Props = $props();
</script>

<div class="card card-{variant} padding-{padding}">
	{@render children()}
</div>

<style>
	.card {
		background: var(--color-bg-2);
		border-radius: var(--radius-lg);
	}

	.card-default,
	.card-bordered,
	.card-flat {
		border: 1px solid var(--color-border);
	}

	.padding-none { padding: 0; }
	.padding-sm   { padding: var(--space-3); }
	.padding-md   { padding: var(--space-4) var(--space-5); }
	.padding-lg   { padding: var(--space-5) var(--space-6); }
</style>
