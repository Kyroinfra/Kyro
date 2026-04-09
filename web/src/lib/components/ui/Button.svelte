<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit' | 'reset';
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		type = 'button',
		onclick,
		children
	}: Props = $props();
</script>

<button
	{type}
	{disabled}
	class="btn btn-{variant} btn-{size}"
	class:loading
	onclick={onclick}
>
	{#if loading}
		<span class="spinner"></span>
	{/if}
	<span class="content" class:hidden={loading}>
		{@render children()}
	</span>
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		font-weight: 500;
		border-radius: var(--radius-md);
		transition: all 0.15s ease;
		position: relative;
		white-space: nowrap;
		cursor: pointer;
	}

	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn-sm {
		height: 32px;
		padding: 0 var(--space-3);
		font-size: var(--font-size-xs);
	}

	.btn-md {
		height: 40px;
		padding: 0 var(--space-4);
	}

	.btn-lg {
		height: 48px;
		padding: 0 var(--space-6);
		font-size: var(--font-size-base);
	}

	.btn-primary {
		background: var(--color-text);
		color: var(--color-bg);
		border: 1px solid var(--color-text);
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-text-muted);
		border-color: var(--color-text-muted);
	}

	.btn-secondary {
		background: var(--color-bg-2);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--color-bg-3);
		border-color: var(--color-text-muted);
	}

	.btn-danger {
		background: transparent;
		color: var(--color-danger);
		border: 1px solid var(--color-danger);
	}

	.btn-danger:hover:not(:disabled) {
		background: var(--color-danger);
		color: var(--color-bg);
	}

	.btn-ghost {
		background: transparent;
		color: var(--color-text-muted);
		border: 1px solid transparent;
	}

	.btn-ghost:hover:not(:disabled) {
		color: var(--color-text);
		background: var(--color-bg-2);
		border-color: var(--color-border);
	}

	.content {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.content.hidden {
		visibility: hidden;
	}

	.spinner {
		position: absolute;
		width: 14px;
		height: 14px;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>