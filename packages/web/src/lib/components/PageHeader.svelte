<script lang="ts">
	import type { Snippet } from 'svelte';

	// Terminal-prompt header shared by every dashboard page (#44): `$ ./x.sh`
	// on the left, page actions on the right. `left` (rare) replaces the
	// prompt entirely — e.g. collection detail's back-link.
	interface Props {
		command?: string;
		left?: Snippet;
		children?: Snippet;
	}

	let { command, left, children }: Props = $props();
</script>

<header class="page-header">
	{#if left}
		{@render left()}
	{:else if command}
		<div class="header-content">
			<span class="prompt">$</span>
			<span class="command">./{command}</span>
		</div>
	{/if}
	{#if children}{@render children()}{/if}
</header>

<style>
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin-bottom: var(--space-5);
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.prompt {
		font-family: var(--font-mono);
		color: var(--color-success);
		font-weight: 600;
	}

	.command {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}
</style>
