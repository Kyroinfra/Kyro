<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	let orgName = $state('');
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
</script>

<svelte:head>
	<title>Create Account - Kyro</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-header">
		<a href="/" class="logo">
			<span class="logo-icon">K</span>
			<span class="logo-text">Kyro</span>
		</a>
	</div>

	<Card padding="lg">
		<div class="auth-form">
			<h1>Create your account</h1>
			<p class="subtitle">Start building with Kyro</p>

			<form method="POST">
				<Input
					label="Organization Name"
					type="text"
					placeholder="My Company"
					bind:value={orgName}
					required
				/>
				<Input
					label="Email"
					type="email"
					placeholder="you@example.com"
					bind:value={email}
					required
				/>
				<Input
					label="Password"
					type="password"
					placeholder="••••••••"
					bind:value={password}
					required
				/>
				<Button type="submit" {loading} disabled={loading}>
					{loading ? 'Creating account...' : 'Create Account'}
				</Button>
			</form>

			<p class="footer-text">
				Already have an account? <a href="/login">Sign in</a>
			</p>
		</div>
	</Card>
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
		font-size: var(--font-size-xl);
		font-weight: 700;
		color: var(--color-text);
		text-decoration: none;
	}

	.logo-icon {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-accent);
		color: white;
		border-radius: var(--radius-md);
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.auth-form h1 {
		font-size: var(--font-size-2xl);
		font-weight: 600;
		color: var(--color-text);
	}

	.subtitle {
		color: var(--color-text-muted);
		margin-top: calc(-1 * var(--space-2));
	}

	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		margin-top: var(--space-2);
	}

	form :global(.input-wrapper) {
		margin-bottom: 0;
	}

	form :global(button) {
		margin-top: var(--space-2);
		width: 100%;
	}

	.footer-text {
		text-align: center;
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin-top: var(--space-4);
	}

	.footer-text a {
		color: var(--color-accent);
		font-weight: 500;
	}
</style>
