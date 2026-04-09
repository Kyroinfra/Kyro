<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	let { form } = $props();

	let orgName = $state('');
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
</script>

<svelte:head>
	<title>Register — Kyro</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-header">
		<a href="/" class="logo">
			<span class="logo-mark">K</span>
			<span class="logo-text">kyro</span>
		</a>
		<div class="auth-prompt">
			<span class="prompt-char">$</span>
			<span class="prompt-cmd">auth register</span>
			<span class="cursor"></span>
		</div>
	</div>

	<Card padding="lg">
		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
		>
			<div class="auth-form">
				{#if form?.error}
					<div class="form-error">// {form.error}</div>
				{/if}
				<Input name="orgName" label="Organization" type="text" placeholder="my-org" bind:value={orgName} required />
				<Input name="email" label="Email" type="email" placeholder="user@domain.com" bind:value={email} required />
				<Input name="password" label="Password" type="password" placeholder="min. 8 characters" bind:value={password} required />
				<Button type="submit" {loading} disabled={loading}>
					{loading ? 'creating...' : 'create account'}
				</Button>
			</div>
		</form>
	</Card>

	<p class="footer-text">
		<span class="prompt-char">›</span> Have account? <a href="/login">sign in</a>
	</p>
</div>

<style>
	.auth-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.auth-header {
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
	}

	.logo {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-family: var(--font-mono);
		font-size: var(--font-size-lg);
		font-weight: 700;
		color: var(--color-text);
		text-decoration: none;
		text-transform: lowercase;
	}

	.logo-mark {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-text);
		color: var(--color-bg);
		border-radius: var(--radius-sm);
		font-weight: 700;
		font-size: var(--font-size-base);
	}

	.auth-prompt {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
	}

	.prompt-char {
		color: var(--color-success);
		font-weight: 700;
	}

	.prompt-cmd {
		color: var(--color-text-muted);
	}

	.cursor {
		display: inline-block;
		width: 7px;
		height: 13px;
		background: var(--color-success);
		opacity: 0.6;
		animation: blink 1s step-end infinite;
		border-radius: 1px;
		vertical-align: middle;
	}

	@keyframes blink {
		0%, 100% { opacity: 0.6; }
		50% { opacity: 0; }
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.auth-form :global(button) {
		width: 100%;
		margin-top: var(--space-2);
	}

	.form-error {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--color-danger);
		padding: var(--space-3);
		background: var(--color-danger-dim);
		border: 1px solid var(--color-danger-border);
		border-left: 3px solid var(--color-danger);
		border-radius: var(--radius-md);
	}

	.footer-text {
		text-align: center;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--color-text-ghost);
	}

	.footer-text a {
		color: var(--color-text-dim);
		font-weight: 500;
		transition: color 0.1s ease;
	}

	.footer-text a:hover {
		color: var(--color-text);
	}
</style>
