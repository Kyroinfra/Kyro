<script lang="ts">
  import { user } from "$lib/stores/auth";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import ProgressBar from "$lib/components/ui/ProgressBar.svelte";
  import { formatBytes, formatDateTime } from "$lib/utils/format";
  import {
    uploadFile,
    deleteFile,
    getFiles,
    type FileItem,
  } from "$lib/api/files";

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

  let apiKey = $state("");
  let apiKeyVerified = $state(false);
  let verifyingApiKey = $state(false);
  let apiKeyError = $state<string | null>(null);
  let selectedFile = $state<File | null>(null);
  let uploading = $state(false);
  let uploadProgress = $state(0);
  let showDeleteConfirm = $state(false);
  let fileToDelete = $state<FileItem | null>(null);
  let dragOver = $state(false);
  let uploadError = $state<string | null>(null);

  const canManage = $derived(
    $user?.role === "owner" || $user?.role === "admin",
  );

  $effect(() => {
    files = data.files;
    hasApiKey = data.hasApiKey;
    apiKeyPrefix = data.apiKeyPrefix;
  });

  async function verifyApiKey() {
    if (!apiKey.trim()) {
      apiKeyError = "Please enter an API key";
      return;
    }

    verifyingApiKey = true;
    apiKeyError = null;

    try {
      await getFiles(apiKey);
      apiKeyVerified = true;
      apiKeyError = null;
    } catch (error: any) {
      apiKeyError =
        error.message || "Invalid API key. Make sure it has write scope.";
      apiKeyVerified = false;
    } finally {
      verifyingApiKey = false;
    }
  }

  function changeApiKey() {
    apiKeyVerified = false;
    apiKey = "";
    apiKeyError = null;
  }

  async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length && apiKeyVerified) {
      selectedFile = input.files[0];
      await uploadSelectedFile();
      input.value = "";
    }
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;

    if (!apiKeyVerified) {
      uploadError = "Please verify your API key first";
      return;
    }

    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles?.length) {
      selectedFile = droppedFiles[0];
      await uploadSelectedFile();
    }
  }

  async function uploadSelectedFile() {
    if (!selectedFile || !apiKeyVerified) return;

    uploading = true;
    uploadProgress = 0;
    uploadError = null;

    try {
      const uploaded = await uploadFile(apiKey, selectedFile, (pct) => {
        uploadProgress = pct;
      });

      files = [
        {
          id: uploaded.id,
          name: uploaded.name,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.sizeBytes,
          createdAt: uploaded.createdAt,
        },
        ...files,
      ];

      selectedFile = null;
      uploadProgress = 0;
    } catch (error: any) {
      uploadError = error.message || "Upload failed";
    } finally {
      uploading = false;
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
  }

  async function handleDelete() {
    if (!fileToDelete || !apiKey) return;

    try {
      await deleteFile(apiKey, fileToDelete.id);
      files = files.filter((f) => f.id !== fileToDelete!.id);
    } catch (error: any) {
      console.error("Delete failed:", error);
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
    const url = `/api/files/${file.id}?key=${encodeURIComponent(apiKey)}`;
    window.open(url, "_blank");
  }
</script>

<svelte:head>
  <title>Files - Kyro</title>
</svelte:head>

<div class="files-page">
	<header class="page-header">
		<div class="header-content">
			<span class="prompt">$</span>
			<span class="command">./files.sh</span>
		</div>
	</header>

  {#if !hasApiKey}
    <Card>
      <div class="empty-state">
        <span class="empty-icon">🔑</span>
        <h3>API Key Required</h3>
        <p>
          You need at least one API key with write scope to upload and manage
          files.
        </p>
        <a href="/dashboard/keys">
          <Button>Create API Key</Button>
        </a>
      </div>
    </Card>
  {:else}
    <Card>
      <div class="api-key-section">
        <div class="api-key-header">
          <span class="api-key-icon">🔐</span>
          <span class="api-key-title">API Key</span>
        </div>

        {#if !apiKeyVerified}
          <div class="api-key-input-section">
            <p class="api-key-desc">
              Enter an API key with write scope to manage files
            </p>
            <div class="api-key-row">
              <input
                type="password"
                class="api-key-input"
                bind:value={apiKey}
                placeholder="kyr_xxx..."
                onkeydown={(e) => e.key === "Enter" && verifyApiKey()}
              />
              <Button onclick={verifyApiKey} loading={verifyingApiKey}>
                Verify
              </Button>
            </div>
            {#if apiKeyError}
              <div class="api-key-error">{apiKeyError}</div>
            {/if}
          </div>
        {:else}
          <div class="api-key-verified">
            <div class="verified-info">
              <span class="verified-icon">✓</span>
              <span class="verified-text">Connected</span>
              {#if apiKeyPrefix}
                <span class="verified-prefix">key_{apiKeyPrefix}***</span>
              {/if}
            </div>
            <Button variant="ghost" size="sm" onclick={changeApiKey}>
              Change
            </Button>
          </div>
        {/if}
      </div>
    </Card>

    {#if apiKeyVerified}
      <Card>
        <div
          class="upload-zone"
          class:drag-over={dragOver}
          ondrop={handleDrop}
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
        >
          {#if uploading}
            <div class="upload-progress">
              <span class="upload-filename"
                >{selectedFile?.name || "Uploading..."}</span
              >
              <ProgressBar value={uploadProgress} max={100} showLabel />
            </div>
          {:else}
            <span class="upload-icon">📤</span>
            <span class="upload-text">Drag and drop files here, or</span>
            <label class="upload-btn">
              <input
                type="file"
                class="file-input"
                id="file-input"
                onchange={handleFileSelect}
                accept="*/*"
              />
              <Button
                onclick={() => document.getElementById("file-input")?.click()}
              >
                Browse Files
              </Button>
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
                  <Button
                    variant="secondary"
                    size="sm"
                    onclick={() => downloadFile(file)}
                  >
                    Download
                  </Button>
                  {#if canManage}
                    <Button
                      variant="danger"
                      size="sm"
                      onclick={() => confirmDelete(file)}
                    >
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

	.empty-state {
		text-align: center;
		padding: var(--space-8) var(--space-4);
	}

	.empty-icon {
		display: block;
		margin-bottom: var(--space-3);
		color: var(--color-text-muted);
	}

	.empty-state h3 {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 var(--space-2);
	}

	.empty-state p {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin: 0 0 var(--space-4);
	}

	.api-key-section {
		padding: var(--space-2) 0;
	}

	.api-key-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	.api-key-icon {
		color: var(--color-text-muted);
	}

	.api-key-title {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		font-weight: 600;
		color: var(--color-text);
		text-transform: uppercase;
	}

  .api-key-input-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .api-key-desc {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    margin: 0;
  }

  .api-key-row {
    display: flex;
    gap: var(--space-3);
  }

  .api-key-input {
    flex: 1;
    max-width: 400px;
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-size: var(--font-size-base);
    font-family: var(--font-mono);
  }

  .api-key-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .api-key-error {
    color: var(--color-danger);
    font-size: var(--font-size-sm);
  }

  .api-key-verified {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3);
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid var(--color-success);
    border-radius: var(--radius-md);
  }

  .verified-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .verified-icon {
    color: var(--color-success);
    font-size: var(--font-size-lg);
  }

  .verified-text {
    font-weight: 500;
    color: var(--color-success);
  }

  .verified-prefix {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .upload-zone {
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-8);
    text-align: center;
    transition: all 0.15s ease;
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

  .upload-btn .file-input {
    display: none;
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

