<script lang="ts">
	import type { Snippet } from 'svelte';

	// Shared "nothing here" panel (#44): icon, title, optional hint text and
	// optional action buttons — the per-page copies of this block now flow
	// through one component.
	interface Props {
		icon: string;
		title: string;
		hint?: string;
		actions?: Snippet;
	}

	let { icon, title, hint, actions }: Props = $props();
</script>

<div class="empty-state">
	<span class="empty-icon">{icon}</span>
	<h3>{title}</h3>
	{#if hint}
		<p>{hint}</p>
	{/if}
	{#if actions}{@render actions()}{/if}
</div>

<style>
	.empty-state {
		text-align: center;
		padding: var(--space-8) var(--space-4);
	}

	.empty-icon {
		display: block;
		margin-bottom: var(--space-3);
		font-size: 24px;
	}

	.empty-state h3 {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 var(--space-2);
	}

	.empty-state p {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin: 0 0 var(--space-4);
		max-width: 420px;
		margin-left: auto;
		margin-right: auto;
	}
</style>
