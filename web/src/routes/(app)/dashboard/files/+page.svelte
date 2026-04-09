<script lang="ts">
	import { enhance } from '$app/forms';
	import { user } from '$lib/stores/auth';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import { formatBytes, formatDateTime } from '$lib/utils/format';
	import { uploadFile, deleteFile, type FileItem } from '$lib/api/files';

	interface Props {
		data: {
			files: Array<{
				id: string;
				name: string;
				mimeType: string;
				sizeBytes: number;
				createdAt: string;
			}>;
			hasApiKey: boolean;
			apiKeyPrefix: string | null;
		};
	}

	let { data }: Props = $props();

	let files = $state(data.files);
	let hasApiKey = $state(data.hasApiKey);
	let apiKeyPrefix = $state(data.apiKeyPrefix);

	let apiKey = $state('');
	let fileInput: HTMLInputElement;
	let uploading = $state(false);
	let uploadProgress = $state(0);
	let showDeleteConfirm = $state(false);
	let fileToDelete = $state<FileItem | null>(null);
	let dragOver = $state(false);
	let uploadError = $state<string | null>(null);

	const canManage = $derived($user?.role === 'owner' || $user?.role === 'admin');

	$effect(() => {
		files = data.files;
		hasApiKey = data.hasApiKey;
		apiKeyPrefix = data.apiKeyPrefix;
	});

	async function handleUpload() {
		if (!fileInput?.files?.length || !apiKey) return;

		const file = fileInput.files[0];
		uploading = true;
		uploadProgress = 0;
		uploadError = null;

		try {
			const uploaded = await uploadFile(apiKey, file, (pct) => {
				uploadProgress = pct;
			});

			files = [
				{
					id: uploaded.id,
					name: uploaded.name,
					mimeType: uploaded.mimeType,
					sizeBytes: uploaded.sizeBytes,
					createdAt: uploaded.createdAt
				},
				...files
			];

			fileInput.value = '';
			uploadProgress = 0;
		} catch (error: any) {
			uploadError = error.message || 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		if (e.dataTransfer?.files?.length && apiKey) {
			fileInput.files = e.dataTransfer.files;
			handleUpload();
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	async function handleDelete() {
		if (!fileToDelete || !apiKey) return;

		try {
			await deleteFile(apiKey, fileToDelete.id);
			files = files.filter(f => f.id !== fileToDelete!.id);
		} catch (error: any) {
			console.error('Delete failed:', error);
		} finally {
			showDeleteConfirm = false;
			fileToDelete = null;
		}
	}

	function confirmDelete(file: FileItem) {
		fileToDelete = file;
		showDeleteConfirm = true;
	}

	function downloadFile(file: FileItem) {
		if (!apiKey) return;
		const url = `/api/v1/files/${file.id}?key=${apiKey}`;
		window.open(url, '_blank');
	}
</script>

<svelte:head>
	<title>Files - Kyro</title>
</svelte:head>

<div class="files-page">
	<header class="page-header">
		<div>
			<h1>Files</h1>
			<p class="subtitle">Manage your organization's uploaded files</p>
		</div>
	</header>

	{#if !hasApiKey}
		<Card>
			<div class="empty-state">
				<span class="empty-icon">🔑</span>
				<h3>API Key Required</h3>
				<p>You need at least one API key with write scope to upload and manage files.</p>
				<a href="/dashboard/keys">
					<Button>Create API Key</Button>
				</a>
			</div>
		</Card>
	{:else}
		{#if !apiKey}
			<Card>
				<div class="api-key-prompt">
					<h3>Enter API Key</h3>
					<p>Enter an API key with write scope to manage files.</p>
					<div class="api-key-input">
						<input
							type="password"
							bind:value={apiKey}
							placeholder="kyr_xxx..."
						/>
					</div>
				</div>
			</Card>
		{:else}
			<Card>
				<div
					class="upload-zone"
					class:drag-over={dragOver}
					ondrop={handleDrop}
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					role="button"
					tabindex="0"
				>
					{#if uploading}
						<div class="upload-progress">
							<span class="upload-filename">{fileInput?.files?.[0]?.name || 'Uploading...'}</span>
							<ProgressBar value={uploadProgress} max={100} showLabel />
						</div>
					{:else}
						<span class="upload-icon">📤</span>
						<span class="upload-text">Drag and drop files here, or</span>
						<label class="upload-btn">
							<input
								type="file"
								bind:this={fileInput}
								onchange={handleUpload}
								hidden
							/>
							<Button>Browse Files</Button>
						</label>
					{/if}
				</div>
				{#if uploadError}
					<div class="upload-error">{uploadError}</div>
				{/if}
			</Card>

			{#if files.length === 0}
				<Card>
					<div class="empty-state">
						<span class="empty-icon">📁</span>
						<h3>No files yet</h3>
						<p>Upload your first file to get started.</p>
					</div>
				</Card>
			{:else}
				<div class="files-list">
					{#each files as file}
						<Card>
							<div class="file-card">
								<div class="file-info">
									<div class="file-name">{file.name}</div>
									<div class="file-meta">
										<span>{formatBytes(file.sizeBytes)}</span>
										<span>•</span>
										<span>{file.mimeType}</span>
										<span>•</span>
										<span>{formatDateTime(file.createdAt)}</span>
									</div>
								</div>
								<div class="file-actions">
									<Button variant="secondary" size="sm" onclick={() => downloadFile(file)}>
										Download
									</Button>
									{#if canManage}
										<Button variant="danger" size="sm" onclick={() => confirmDelete(file)}>
											Delete
										</Button>
									{/if}
								</div>
							</div>
						</Card>
					{/each}
				</div>
			{/if}
		{/if}
	{/if}
</div>

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete File"
	message="Are you sure you want to delete this file? This action cannot be undone."
	confirmLabel="Delete"
	variant="danger"
	onconfirm={handleDelete}
	oncancel={() => (showDeleteConfirm = false)}
/>

<style>
	.files-page {
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
		margin: 0;
	}

	.api-key-prompt {
		text-align: center;
		padding: var(--space-4);
	}

	.api-key-prompt h3 {
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 var(--space-2);
	}

	.api-key-prompt p {
		color: var(--color-text-muted);
		margin: 0 0 var(--space-4);
	}

	.api-key-input input {
		width: 100%;
		max-width: 400px;
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-size: var(--font-size-base);
		font-family: var(--font-mono);
	}

	.api-key-input input:focus {
		outline: none;
		border-color: var(--color-accent);
	}

	.upload-zone {
		border: 2px dashed var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-8);
		text-align: center;
		transition: all 0.15s ease;
		cursor: pointer;
	}

	.upload-zone:hover,
	.upload-zone.drag-over {
		border-color: var(--color-accent);
		background: rgba(99, 102, 241, 0.05);
	}

	.upload-icon {
		font-size: 32px;
		display: block;
		margin-bottom: var(--space-2);
	}

	.upload-text {
		color: var(--color-text-muted);
		margin-right: var(--space-2);
	}

	.upload-btn {
		cursor: pointer;
	}

	.upload-progress {
		text-align: center;
	}

	.upload-filename {
		display: block;
		font-size: var(--font-size-sm);
		color: var(--color-text);
		margin-bottom: var(--space-2);
	}

	.upload-error {
		color: var(--color-danger);
		font-size: var(--font-size-sm);
		margin-top: var(--space-3);
		text-align: center;
	}

	.files-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}

	.file-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-4);
	}

	.file-info {
		flex: 1;
		min-width: 0;
	}

	.file-name {
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: var(--space-1);
		word-break: break-all;
	}

	.file-meta {
		display: flex;
		gap: var(--space-2);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.file-actions {
		display: flex;
		gap: var(--space-2);
		flex-shrink: 0;
	}
</style>
