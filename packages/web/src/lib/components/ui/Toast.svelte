<script lang="ts">
	import { toast, type Toast } from '$lib/stores/toast';

	let toasts: Toast[] = $state([]);

	toast.subscribe((value) => {
		toasts = value;
	});
</script>

{#if toasts.length > 0}
	<div class="toast-container">
		{#each toasts as t (t.id)}
			<div class="toast toast-{t.type}">
				<div class="toast-bar"></div>
				<div class="toast-content">
					<span class="message">{t.message}</span>
					<button class="close" onclick={() => toast.remove(t.id)}>✕</button>
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	.toast-container {
		position: fixed;
		bottom: var(--space-5);
		right: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		z-index: 9999;
		max-width: 380px;
	}

	.toast {
		display: flex;
		overflow: hidden;
		background: var(--color-bg-2);
		border: 1px solid var(--color-border-2);
		border-radius: var(--radius-lg);
		animation: slideIn 0.15s ease;
		box-shadow: 0 8px 30px rgba(0,0,0,0.5);
	}

	.toast-bar {
		width: 3px;
		flex-shrink: 0;
	}

	.toast-success .toast-bar { background: var(--color-success); }
	.toast-error   .toast-bar { background: var(--color-danger); }
	.toast-warning .toast-bar { background: var(--color-warning); }
	.toast-info    .toast-bar { background: var(--color-text-dim); }

	.toast-content {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		flex: 1;
	}

	.message {
		flex: 1;
		font-size: var(--font-size-sm);
		color: var(--color-text-dim);
		line-height: 1.4;
	}

	.close {
		background: none;
		border: none;
		color: var(--color-text-ghost);
		font-size: var(--font-size-xs);
		padding: 2px;
		cursor: pointer;
		transition: color 0.1s;
		line-height: 1;
	}

	.close:hover {
		color: var(--color-text-muted);
	}

	@keyframes slideIn {
		from {
			transform: translateX(110%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}
</style>
