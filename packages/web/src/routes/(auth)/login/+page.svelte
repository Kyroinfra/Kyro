<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthShell from '$lib/components/AuthShell.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let { form } = $props();

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
</script>

<svelte:head>
	<title>Sign In — Kyro</title>
</svelte:head>

<AuthShell
	cmd="signin"
	error={form?.error}
	altPrefix="No account?"
	altLabel="register"
	altHref="/register"
>
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
		<Input name="email" label="Email" type="email" placeholder="user@domain.com" bind:value={email} required />
		<Input
			name="password"
			label="Password"
			type="password"
			placeholder="••••••••"
			bind:value={password}
			required
		/>
		<Button type="submit" {loading} disabled={loading}>
			{loading ? 'authenticating...' : 'sign in'}
		</Button>
	</form>
</AuthShell>
