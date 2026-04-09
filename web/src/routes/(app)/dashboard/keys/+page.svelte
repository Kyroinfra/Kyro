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
				revokedAt: string | null;
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
	let filter = $state<'all' | 'active' | 'revoked'>('all');

	let newKey = $state<string | null>(form?.newKey || null);
	let keyName = $state('');
	let selectedScopes = $state<string[]>(['read']);

	const canManage = $derived($user?.role === 'owner' || $user?.role === 'admin');

	const filteredKeys = $derived(() => {
		if (filter === 'active') return data.keys.filter(k => !k.revokedAt);
		if (filter === 'revoked') return data.keys.filter(k => k.revokedAt);
		return data.keys;
	});

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
		<div class="header-content">
			<span class="prompt">$</span>
			<span class="command">./keys.sh</span>
		</div>
		{#if canManage}
			<Button onclick={() => (showCreateModal = true)}>+ New Key</Button>
		{/if}
	</header>

	{#if newKey}
		<div class="key-reveal">
			<div class="key-reveal-header">
				<span class="key-reveal-title">> API Key Generated</span>
				<button class="dismiss-btn" onclick={dismissKey}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
			<p class="key-reveal-warning">// Copy now - cannot be retrieved again</p>
			<div class="key-value">
				<code>{newKey}</code>
				<Button variant="secondary" size="sm" onclick={handleCopy}>
					{copied ? 'Copied' : 'Copy'}
				</Button>
			</div>
		</div>
	{/if}

	{#if data.keys.length === 0}
		<Card>
			<div class="empty-state">
				<span class="empty-icon">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
					</svg>
				</span>
				<h3>No API keys</h3>
				<p>Create your first key to authenticate with the API</p>
				{#if canManage}
					<Button onclick={() => (showCreateModal = true)}>+ Create First Key</Button>
				{/if}
			</div>
		</Card>
	{:else}
		<div class="filter-tabs">
			<button class="filter-tab" class:active={filter === 'all'} onclick={() => (filter = 'all')}>
				<span class="filter-marker">[</span>all<span class="filter-marker">]</span>
			</button>
			<button class="filter-tab" class:active={filter === 'active'} onclick={() => (filter = 'active')}>
				<span class="filter-marker">[</span>active<span class="filter-marker">]</span>
			</button>
			<button class="filter-tab" class:active={filter === 'revoked'} onclick={() => (filter = 'revoked')}>
				<span class="filter-marker">[</span>revoked<span class="filter-marker">]</span>
			</button>
		</div>

		<div class="keys-list">
			{#each filteredKeys() as key}
				<Card>
					<div class="key-card" class:revoked={key.revokedAt}>
						<div class="key-info">
							<div class="key-header">
								<span class="key-name" class:revoked={key.revokedAt}>{key.name}</span>
								{#if key.revokedAt}
									<Badge variant="danger">Revoked</Badge>
								{/if}
							</div>
							<div class="key-prefix" class:revoked={key.revokedAt}>key_{key.prefix}***</div>
							<div class="key-meta">
								<span class="key-date">Created {formatDate(key.createdAt)}</span>
								{#if key.lastUsedAt}
									<span class="key-date">Last used {formatDateTime(key.lastUsedAt)}</span>
								{:else}
									<span class="key-date">Never used</span>
								{/if}
								{#if key.revokedAt}
									<span class="key-date revoked-date">Revoked {formatDate(key.revokedAt)}</span>
								{/if}
							</div>
							<div class="key-scopes">
								{#each key.scopes as scope}
									<Badge>{scope}</Badge>
								{/each}
							</div>
						</div>
						{#if canManage && !key.revokedAt}
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
		align-items: center;
		margin-bottom: var(--space-5);
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.prompt {
		font-family: var(--font-mono);
		color: var(--color-success);
		font-weight: 600;
	}

	.command {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
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

	.key-card.revoked {
		opacity: 0.6;
	}

	.filter-tabs {
		display: flex;
		gap: var(--space-1);
		margin-bottom: var(--space-4);
		width: fit-content;
	}

	.filter-tab {
		padding: var(--space-2) var(--space-3);
		background: transparent;
		border: none;
		color: var(--color-text-muted);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		cursor: pointer;
		transition: all 0.15s ease;
		border-radius: var(--radius-sm);
	}

	.filter-tab:hover {
		color: var(--color-text);
		background: var(--color-bg-2);
	}

	.filter-tab.active {
		color: var(--color-text);
		background: var(--color-bg-2);
	}

	.filter-marker {
		color: var(--color-text-muted);
	}

	.key-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-1);
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

	.key-name.revoked {
		text-decoration: line-through;
		color: var(--color-text-muted);
	}

	.key-prefix {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin-bottom: var(--space-2);
	}

	.key-prefix.revoked {
		opacity: 0.6;
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
