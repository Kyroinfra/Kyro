<script lang="ts">
	import { toast, type Toast } from '$lib/stores/toast';

	let toasts: Toast[] = $state([]);

	toast.subscribe((value) => {
		toasts = value;
	});

	function getIcon(type: Toast['type']) {
		switch (type) {
			case 'success':
				return '✓';
			case 'error':
				return '✕';
			case 'warning':
				return '⚠';
			case 'info':
				return 'ℹ';
		}
	}
</script>

{#if toasts.length > 0}
	<div class="toast-container">
		{#each toasts as t (t.id)}
			<div class="toast toast-{t.type}">
				<span class="icon">{getIcon(t.type)}</span>
				<span class="message">{t.message}</span>
				<button class="close" onclick={() => toast.remove(t.id)}>✕</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.toast-container {
		position: fixed;
		bottom: var(--space-4);
		right: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		z-index: 9999;
		max-width: 400px;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		background: var(--color-bg-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		animation: slideIn 0.2s ease;
	}

	.toast-success {
		border-left: 3px solid var(--color-success);
	}

	.toast-error {
		border-left: 3px solid var(--color-danger);
	}

	.toast-warning {
		border-left: 3px solid var(--color-warning);
	}

	.toast-info {
		border-left: 3px solid var(--color-accent);
	}

	.icon {
		font-size: var(--font-size-sm);
		font-weight: 600;
	}

	.toast-success .icon {
		color: var(--color-success);
	}

	.toast-error .icon {
		color: var(--color-danger);
	}

	.toast-warning .icon {
		color: var(--color-warning);
	}

	.toast-info .icon {
		color: var(--color-accent);
	}

	.message {
		flex: 1;
		font-size: var(--font-size-sm);
		color: var(--color-text);
	}

	.close {
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: var(--font-size-xs);
		padding: var(--space-1);
		cursor: pointer;
		opacity: 0.7;
		transition: opacity 0.15s;
	}

	.close:hover {
		opacity: 1;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}
</style>
