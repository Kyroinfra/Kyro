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
	<div class="dialog-backdrop" transition:fade={{ duration: 150 }} onclick={oncancel} role="dialog" aria-modal="true" tabindex="-1">
		<div class="dialog" transition:scale={{ duration: 150, start: 0.95 }} onclick={(e) => e.stopPropagation()}>
			<h3>{title}</h3>
			<p>{message}</p>
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
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1001;
		padding: var(--space-4);
	}

	.dialog {
		background: var(--color-bg-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-5);
		width: 100%;
		max-width: 400px;
	}

	h3 {
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 var(--space-3);
	}

	p {
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
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-cancel {
		background: var(--color-bg-3);
		border: 1px solid var(--color-border);
		color: var(--color-text);
	}

	.btn-cancel:hover {
		background: var(--color-bg);
		border-color: var(--color-text-muted);
	}

	.btn-confirm {
		border: none;
	}

	.btn-danger {
		background: var(--color-danger);
		color: white;
	}

	.btn-danger:hover {
		background: #dc2626;
	}

	.btn-warning {
		background: var(--color-warning);
		color: black;
	}

	.btn-warning:hover {
		background: #d97706;
	}
</style>
