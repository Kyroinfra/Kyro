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
	<title>Register - Kyro</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-header">
		<div class="logo">
			<span class="logo-mark">K</span>
			<span class="logo-text">kyro</span>
		</div>
		<p class="auth-command">$ register</p>
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
					<div class="form-error">{form.error}</div>
				{/if}
				<Input name="orgName" label="Organization" type="text" placeholder="my-org" bind:value={orgName} required />
				<Input name="email" label="Email" type="email" placeholder="user@domain.com" bind:value={email} required />
				<Input name="password" label="Password" type="password" placeholder="********" bind:value={password} required />
				<Button type="submit" {loading} disabled={loading}>
					{loading ? 'Creating...' : 'Create Account'}
				</Button>
			</div>
		</form>
	</Card>

	<p class="footer-text">
		<span class="prompt">></span> Have account? <a href="/login">Sign in</a>
	</p>
</div>

<style>
	.auth-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.auth-header {
		text-align: center;
	}

	.logo {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-family: var(--font-mono);
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--color-text);
		text-decoration: none;
		margin-bottom: var(--space-2);
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
	}

	.auth-command {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin: 0;
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
		background: rgba(255, 68, 68, 0.1);
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-sm);
	}

	.footer-text {
		text-align: center;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin: 0;
	}

	.prompt {
		color: var(--color-text);
		margin-right: var(--space-1);
	}

	.footer-text a {
		color: var(--color-text);
		font-weight: 500;
	}
</style>