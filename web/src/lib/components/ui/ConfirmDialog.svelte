<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'danger' | 'warning';
		onconfirm: () => void;
		oncancel: () => void;
	}

	let {
		open = $bindable(),
		title,
		message,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		variant = 'danger',
		onconfirm,
		oncancel
	}: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			oncancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="dialog-backdrop" transition:fade={{ duration: 100 }} onclick={oncancel} role="dialog" aria-modal="true" tabindex="-1">
		<div class="dialog" transition:scale={{ duration: 100, start: 0.98 }} onclick={(e) => e.stopPropagation()}>
			<h3 class="dialog-title">{title}</h3>
			<p class="dialog-message">{message}</p>
			<div class="actions">
				<button class="btn-cancel" onclick={oncancel}>{cancelLabel}</button>
				<button class="btn-confirm btn-{variant}" onclick={onconfirm}>{confirmLabel}</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.dialog-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1001;
		padding: var(--space-4);
	}

	.dialog {
		background: var(--color-bg-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-5);
		width: 100%;
		max-width: 400px;
	}

	.dialog-title {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 var(--space-3);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.dialog-message {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin: 0 0 var(--space-5);
		line-height: 1.5;
	}

	.actions {
		display: flex;
		gap: var(--space-3);
		justify-content: flex-end;
	}

	button {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-sm);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-cancel {
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text);
	}

	.btn-cancel:hover {
		border-color: var(--color-text-muted);
	}

	.btn-confirm {
		border: none;
	}

	.btn-danger {
		background: var(--color-danger);
		color: var(--color-bg);
	}

	.btn-danger:hover {
		background: #ff6666;
	}

	.btn-warning {
		background: var(--color-warning);
		color: var(--color-bg);
	}

	.btn-warning:hover {
		background: #ffcc00;
	}
</style>