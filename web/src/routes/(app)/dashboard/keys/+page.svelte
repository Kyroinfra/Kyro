<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { user } from '$lib/stores/auth';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import { formatDate, formatDateTime } from '$lib/utils/format';

	interface Props {
		data: {
			keys: Array<{
				id: string;
				name: string;
				prefix: string;
				scopes: string[];
				lastUsedAt: string | null;
				createdAt: string;
			}>;
		};
		form?: {
			success?: boolean;
			error?: string;
			newKey?: string;
		};
	}

	let { data, form }: Props = $props();

	let showCreateModal = $state(false);
	let showDeleteConfirm = $state(false);
	let keyToDelete = $state<string | null>(null);
	let copied = $state(false);
	let createError = $state<string | null>(null);
	let creating = $state(false);

	let newKey = $state<string | null>(form?.newKey || null);
	let keyName = $state('');
	let selectedScopes = $state<string[]>(['read']);

	const canManage = $derived($user?.role === 'owner' || $user?.role === 'admin');

	function handleCreateSubmit() {
		creating = true;
		createError = null;
	}

	function handleKeyCreated(result: { newKey?: string }) {
		if (result?.newKey) {
			newKey = result.newKey;
			showCreateModal = false;
			keyName = '';
			selectedScopes = ['read'];
		}
		creating = false;
	}

	function handleCopy() {
		if (newKey) {
			navigator.clipboard.writeText(newKey);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}

	function dismissKey() {
		newKey = null;
	}

	function confirmDelete(id: string) {
		keyToDelete = id;
		showDeleteConfirm = true;
	}

	async function handleDelete() {
		if (!keyToDelete) return;
		const formData = new FormData();
		formData.append('id', keyToDelete);
		await fetch('?/delete', {
			method: 'POST',
			body: formData
		});
		showDeleteConfirm = false;
		keyToDelete = null;
		window.location.reload();
	}
</script>

<svelte:head>
	<title>API Keys - Kyro</title>
</svelte:head>

<div class="keys-page">
	<header class="page-header">
		<div>
			<h1>API Keys</h1>
			<p class="subtitle">Manage your organization's API keys</p>
		</div>
		{#if canManage}
			<Button onclick={() => (showCreateModal = true)}>Create Key</Button>
		{/if}
	</header>

	{#if newKey}
		<div class="key-reveal">
			<div class="key-reveal-header">
				<span class="key-reveal-icon">🔑</span>
				<span class="key-reveal-title">Your new API key</span>
				<button class="dismiss-btn" onclick={dismissKey}>✕</button>
			</div>
			<p class="key-reveal-warning">Copy this key now — it won't be shown again.</p>
			<div class="key-value">
				<code>{newKey}</code>
				<Button variant="secondary" size="sm" onclick={handleCopy}>
					{copied ? 'Copied!' : 'Copy'}
				</Button>
			</div>
		</div>
	{/if}

	{#if data.keys.length === 0}
		<Card>
			<div class="empty-state">
				<span class="empty-icon">🔑</span>
				<h3>No API keys yet</h3>
				<p>Create your first API key to start making requests to the Kyro API.</p>
				{#if canManage}
					<Button onclick={() => (showCreateModal = true)}>Create Your First Key</Button>
				{/if}
			</div>
		</Card>
	{:else}
		<div class="keys-list">
			{#each data.keys as key}
				<Card>
					<div class="key-card">
						<div class="key-info">
							<div class="key-name">{key.name}</div>
							<div class="key-prefix">key_{key.prefix}***</div>
							<div class="key-meta">
								<span class="key-date">Created {formatDate(key.createdAt)}</span>
								{#if key.lastUsedAt}
									<span class="key-date">Last used {formatDateTime(key.lastUsedAt)}</span>
								{:else}
									<span class="key-date">Never used</span>
								{/if}
							</div>
							<div class="key-scopes">
								{#each key.scopes as scope}
									<Badge>{scope}</Badge>
								{/each}
							</div>
						</div>
						{#if canManage}
							<Button variant="danger" size="sm" onclick={() => confirmDelete(key.id)}>
								Revoke
							</Button>
						{/if}
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<Modal bind:open={showCreateModal} title="Create API Key" onclose={() => (showCreateModal = false)}>
	<form
		method="POST"
		action="?/create"
		use:enhance={() => {
			handleCreateSubmit();
			return async ({ result }) => {
				if (result.type === 'success') {
					const data = (result as any).data;
					handleKeyCreated(data || {});
				} else if (result.type === 'failure') {
					const data = (result as any).data;
					createError = data?.error ? String(data.error) : 'Failed to create key';
					creating = false;
				}
			};
		}}
	>
		<div class="form-group">
			<label for="key-name">Name</label>
			<input
				type="text"
				id="key-name"
				name="name"
				bind:value={keyName}
				placeholder="My API Key"
				required
			/>
		</div>

		<div class="form-group">
			<label>Scopes</label>
			<div class="scopes-grid">
				<label class="scope-checkbox">
					<input type="checkbox" name="scopes" value="read" bind:group={selectedScopes} />
					<span>Read</span>
				</label>
				<label class="scope-checkbox">
					<input type="checkbox" name="scopes" value="write" bind:group={selectedScopes} />
					<span>Write</span>
				</label>
				<label class="scope-checkbox">
					<input type="checkbox" name="scopes" value="admin" bind:group={selectedScopes} />
					<span>Admin</span>
				</label>
			</div>
		</div>

		{#if createError}
			<div class="error-message">{createError}</div>
		{/if}

		<div class="form-actions">
			<Button variant="secondary" onclick={() => (showCreateModal = false)}>Cancel</Button>
			<Button type="submit" loading={creating}>Create Key</Button>
		</div>
	</form>
</Modal>

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Revoke API Key"
	message="Are you sure you want to revoke this API key? Any applications using this key will stop working."
	confirmLabel="Revoke"
	variant="danger"
	onconfirm={handleDelete}
	oncancel={() => (showDeleteConfirm = false)}
/>

<style>
	.keys-page {
		max-width: 900px;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-6);
	}

	.page-header h1 {
		font-size: var(--font-size-2xl);
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
	}

	.subtitle {
		color: var(--color-text-muted);
		margin-top: var(--space-1);
	}

	.key-reveal {
		background: var(--color-bg-2);
		border: 1px solid var(--color-warning);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		margin-bottom: var(--space-6);
	}

	.key-reveal-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.key-reveal-icon {
		font-size: var(--font-size-lg);
	}

	.key-reveal-title {
		font-weight: 600;
		color: var(--color-text);
		flex: 1;
	}

	.dismiss-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: var(--space-1);
		font-size: var(--font-size-sm);
	}

	.dismiss-btn:hover {
		color: var(--color-text);
	}

	.key-reveal-warning {
		color: var(--color-warning);
		font-size: var(--font-size-sm);
		margin-bottom: var(--space-3);
	}

	.key-value {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.key-value code {
		flex: 1;
		background: var(--color-bg);
		padding: var(--space-3);
		border-radius: var(--radius-md);
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--color-text);
		word-break: break-all;
	}

	.empty-state {
		text-align: center;
		padding: var(--space-10) var(--space-4);
	}

	.empty-icon {
		font-size: 48px;
		display: block;
		margin-bottom: var(--space-4);
	}

	.empty-state h3 {
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 var(--space-2);
	}

	.empty-state p {
		color: var(--color-text-muted);
		margin: 0 0 var(--space-4);
	}

	.keys-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.key-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-4);
	}

	.key-info {
		flex: 1;
		min-width: 0;
	}

	.key-name {
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: var(--space-1);
	}

	.key-prefix {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin-bottom: var(--space-2);
	}

	.key-meta {
		display: flex;
		gap: var(--space-4);
		margin-bottom: var(--space-2);
	}

	.key-date {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.key-scopes {
		display: flex;
		gap: var(--space-2);
	}

	.form-group {
		margin-bottom: var(--space-4);
	}

	.form-group label {
		display: block;
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--color-text);
		margin-bottom: var(--space-2);
	}

	.form-group input[type='text'] {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-size: var(--font-size-base);
	}

	.form-group input[type='text']:focus {
		outline: none;
		border-color: var(--color-accent);
	}

	.scopes-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.scope-checkbox {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		cursor: pointer;
	}

	.scope-checkbox input {
		width: 16px;
		height: 16px;
		accent-color: var(--color-accent);
	}

	.scope-checkbox span {
		font-size: var(--font-size-sm);
		color: var(--color-text);
	}

	.error-message {
		color: var(--color-danger);
		font-size: var(--font-size-sm);
		margin-bottom: var(--space-3);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}
</style>
