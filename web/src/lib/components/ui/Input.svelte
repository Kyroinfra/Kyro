<script lang="ts">
	interface Props {
		label?: string;
		type?: 'text' | 'email' | 'password' | 'number';
		placeholder?: string;
		value?: string;
		error?: string;
		disabled?: boolean;
		required?: boolean;
		oninput?: (e: Event) => void;
		onchange?: (e: Event) => void;
	}

	let {
		label,
		type = 'text',
		placeholder = '',
		value = $bindable(''),
		error,
		disabled = false,
		required = false,
		oninput,
		onchange
	}: Props = $props();
</script>

<div class="input-wrapper">
	{#if label}
		<label class="label">
			{label}
			{#if required}<span class="required">*</span>{/if}
		</label>
	{/if}
	<input
		{type}
		{placeholder}
		bind:value
		{disabled}
		{required}
		class="input"
		class:error={!!error}
		oninput={oninput}
		onchange={onchange}
	/>
	{#if error}
		<span class="error-text">{error}</span>
	{/if}
</div>

<style>
	.input-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.label {
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--color-text);
	}

	.required {
		color: var(--color-danger);
		margin-left: 2px;
	}

	.input {
		height: 40px;
		padding: 0 var(--space-3);
		background: var(--color-bg-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-size: var(--font-size-base);
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.input::placeholder {
		color: var(--color-text-muted);
	}

	.input:focus {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
	}

	.input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.input.error {
		border-color: var(--color-danger);
	}

	.input.error:focus {
		box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
	}

	.error-text {
		font-size: var(--font-size-sm);
		color: var(--color-danger);
	}
</style>
