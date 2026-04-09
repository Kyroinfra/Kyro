<script lang="ts">
	import { enhance } from '$app/forms';
	import { user } from '$lib/stores/auth';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { formatDate } from '$lib/utils/format';

	interface Props {
		data: {
			org: {
				id: string;
				name: string;
				slug: string;
				plan: string;
				createdAt: string;
			} | null;
			members: Array<{
				id: string;
				email: string;
				role: 'owner' | 'admin' | 'member';
				createdAt: string;
			}>;
		};
		form?: {
			success?: boolean;
			error?: string;
		};
	}

	let { data, form }: Props = $props();

	let org = $state(data.org);
	let members = $state(data.members);

	let showInviteModal = $state(false);
	let showRemoveConfirm = $state(false);
	let memberToRemove = $state<{ id: string; email: string } | null>(null);
	let inviteError = $state<string | null>(null);
	let inviting = $state(false);

	const isOwner = $derived($user?.role === 'owner');
	const isAdmin = $derived($user?.role === 'admin' || $user?.role === 'owner');

	$effect(() => {
		org = data.org;
		members = data.members;
	});

	function confirmRemove(member: { id: string; email: string }) {
		memberToRemove = member;
		showRemoveConfirm = true;
	}

	async function handleRemove() {
		if (!memberToRemove) return;
		const formData = new FormData();
		formData.append('id', memberToRemove.id);
		await fetch('?/remove', {
			method: 'POST',
			body: formData
		});
		showRemoveConfirm = false;
		memberToRemove = null;
		window.location.reload();
	}

	function handleInviteSubmit() {
		inviting = true;
		inviteError = null;
	}
</script>

<svelte:head>
	<title>Settings - Kyro</title>
</svelte:head>

<div class="settings-page">
	<header class="page-header">
		<div class="header-content">
			<span class="prompt">$</span>
			<span class="command">./settings.sh</span>
		</div>
	</header>

	{#if org}
		<Card>
			<div class="section">
				<div class="section-title">// Organization</div>
				<div class="org-info">
					<div class="org-field">
						<label>Name</label>
						<span>{org.name}</span>
					</div>
					<div class="org-field">
						<label>Slug</label>
						<span>{org.slug}</span>
					</div>
					<div class="org-field">
						<label>Plan</label>
						<Badge>{org.plan}</Badge>
					</div>
					<div class="org-field">
						<label>Created</label>
						<span>{formatDate(org.createdAt)}</span>
					</div>
				</div>
			</div>
		</Card>
	{/if}

	<Card>
		<div class="section">
			<div class="section-header">
				<span class="section-title">// Team Members</span>
				{#if isOwner}
					<Button onclick={() => (showInviteModal = true)}>+ Invite</Button>
				{/if}
			</div>

			{#if members.length === 0}
				<p class="empty-message">No members found.</p>
			{:else}
				<div class="members-list">
					{#each members as member}
						<div class="member-row">
							<div class="member-info">
								<span class="member-email">{member.email}</span>
								<span class="member-date">Joined {formatDate(member.createdAt)}</span>
							</div>
							<div class="member-role">
								<Badge>{member.role}</Badge>
							</div>
							{#if isOwner && member.role !== 'owner'}
								<Button variant="danger" size="sm" onclick={() => confirmRemove({ id: member.id, email: member.email })}>
									Remove
								</Button>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</Card>

	{#if isOwner}
		<Card>
			<div class="section danger-zone">
				<h2>Danger Zone</h2>
				<p class="danger-warning">These actions are irreversible. Please proceed with caution.</p>
				<div class="danger-actions">
					<div class="danger-item">
						<div class="danger-info">
							<span class="danger-label">Delete Organization</span>
							<span class="danger-desc">Permanently delete this organization and all its data.</span>
						</div>
						<Button variant="danger">Delete Organization</Button>
					</div>
				</div>
			</div>
		</Card>
	{/if}
</div>

<Modal bind:open={showInviteModal} title="Invite Member" onclose={() => (showInviteModal = false)}>
	<form
		method="POST"
		action="?/invite"
		use:enhance={() => {
			handleInviteSubmit();
			return async ({ result }) => {
				if (result.type === 'success') {
					showInviteModal = false;
					window.location.reload();
				} else if (result.type === 'failure') {
					const data = (result as any).data;
					inviteError = data?.error || 'Failed to invite member';
					inviting = false;
				}
			};
		}}
	>
		<div class="form-group">
			<label for="invite-email">Email</label>
			<input
				type="email"
				id="invite-email"
				name="email"
				placeholder="member@example.com"
				required
			/>
		</div>

		<div class="form-group">
			<label for="invite-password">Password</label>
			<input
				type="password"
				id="invite-password"
				name="password"
				placeholder="Enter a temporary password"
				required
			/>
		</div>

		<div class="form-group">
			<label for="invite-role">Role</label>
			<select id="invite-role" name="role" required>
				<option value="member">Member</option>
				<option value="admin">Admin</option>
			</select>
		</div>

		{#if inviteError}
			<div class="error-message">{inviteError}</div>
		{/if}

		<div class="form-actions">
			<Button variant="secondary" onclick={() => (showInviteModal = false)}>Cancel</Button>
			<Button type="submit" loading={inviting}>Send Invite</Button>
		</div>
	</form>
</Modal>

<ConfirmDialog
	bind:open={showRemoveConfirm}
	title="Remove Member"
	message="Are you sure you want to remove {memberToRemove?.email} from this organization?"
	confirmLabel="Remove"
	variant="danger"
	onconfirm={handleRemove}
	oncancel={() => (showRemoveConfirm = false)}
/>

<style>
	.settings-page {
		max-width: 800px;
	}

	.page-header {
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

	.section {
		padding: var(--space-4) 0;
	}

	.section h2 {
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 var(--space-4);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
	}

	.section-header h2 {
		margin: 0;
	}

	.org-info {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-4);
	}

	.org-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.org-field label {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.org-field span {
		font-size: var(--font-size-base);
		color: var(--color-text);
	}

	.empty-message {
		color: var(--color-text-muted);
		text-align: center;
		padding: var(--space-6);
	}

	.members-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.member-row {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-3);
		background: var(--color-bg);
		border-radius: var(--radius-md);
	}

	.member-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.member-email {
		font-weight: 500;
		color: var(--color-text);
	}

	.member-date {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.danger-zone {
		border-top: 1px solid var(--color-border);
		margin-top: var(--space-4);
		padding-top: var(--space-4);
	}

	.danger-warning {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin: 0 0 var(--space-4);
	}

	.danger-actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.danger-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-md);
	}

	.danger-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.danger-label {
		font-weight: 500;
		color: var(--color-danger);
	}

	.danger-desc {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
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

	.form-group input,
	.form-group select {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-size: var(--font-size-base);
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--color-accent);
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