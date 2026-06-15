<script lang="ts">
	interface Props {
		name?: string;
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
		name,
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
		<label class="label" for={name}>
			{label}{#if required}<span class="required">*</span>{/if}
		</label>
	{/if}
	<input
		{name}
		{type}
		{placeholder}
		bind:value
		{disabled}
		{required}
		class="input"
		class:error={!!error}
		{oninput}
		{onchange}
	/>
	{#if error}
		<span class="error-text">// {error}</span>
	{/if}
</div>

<style>
	.input-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.label {
		font-family: var(--font-mono);
		font-size: var(--font-size-2xs);
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.required {
		color: var(--color-danger);
		margin-left: 2px;
	}

	.input {
		height: 36px;
		padding: 0 var(--space-3);
		background: var(--color-bg);
		border: 1px solid var(--color-border-2);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		transition: border-color 0.1s ease;
		outline: none;
	}

	.input::placeholder {
		color: var(--color-text-ghost);
		font-family: var(--font-mono);
	}

	.input:focus {
		border-color: var(--color-border-active);
	}

	.input:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.input.error {
		border-color: var(--color-danger-border);
	}

	.error-text {
		font-size: var(--font-size-xs);
		color: var(--color-danger);
		font-family: var(--font-mono);
	}
</style>
