<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	interface Props {
		open: boolean;
		title: string;
		onclose: () => void;
		children: Snippet;
	}

	let { open = $bindable(), title, onclose, children }: Props = $props();

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="modal-backdrop" transition:fade={{ duration: 80 }} onclick={handleBackdrop} role="dialog" aria-modal="true">
		<div class="modal" transition:scale={{ duration: 80, start: 0.97 }}>
			<header class="modal-header">
				<div class="modal-title-row">
					<span class="title-prefix">_</span>
					<h2 class="modal-title">{title}</h2>
				</div>
				<button class="close-btn" onclick={onclose} aria-label="Close">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</header>
			<div class="modal-body">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: var(--space-4);
		backdrop-filter: blur(2px);
	}

	.modal {
		background: var(--color-bg-2);
		border: 1px solid var(--color-border-2);
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 480px;
		max-height: 90vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 0 0 1px var(--color-border), 0 20px 60px rgba(0,0,0,0.6);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-5);
		border-bottom: 1px solid var(--color-border);
	}

	.modal-title-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.title-prefix {
		color: var(--color-success);
		font-weight: 700;
		font-size: var(--font-size-sm);
	}

	.modal-title {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
		text-transform: lowercase;
		letter-spacing: 0.3px;
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: var(--space-1);
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.1s ease;
	}

	.close-btn:hover {
		color: var(--color-text-dim);
	}

	.modal-body {
		padding: var(--space-5);
		overflow-y: auto;
	}
</style>
