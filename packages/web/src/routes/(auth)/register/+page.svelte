<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthShell from '$lib/components/AuthShell.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let { form } = $props();

	let orgName = $state('');
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
</script>

<svelte:head>
	<title>Register — Kyro</title>
</svelte:head>

<AuthShell
	cmd="register"
	error={form?.error}
	altPrefix="Have account?"
	altLabel="sign in"
	altHref="/login"
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
		<Input name="orgName" label="Organization" type="text" placeholder="my-org" bind:value={orgName} required />
		<Input name="email" label="Email" type="email" placeholder="user@domain.com" bind:value={email} required />
		<Input
			name="password"
			label="Password"
			type="password"
			placeholder="min. 8 characters"
			bind:value={password}
			required
		/>
		<Button type="submit" {loading} disabled={loading}>
			{loading ? 'creating...' : 'create account'}
		</Button>
	</form>
</AuthShell>
