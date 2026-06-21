<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from "$lib/stores/auth";
  import { apiKey, apiKeyVerified } from "$lib/stores/apiKey";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import ProgressBar from "$lib/components/ui/ProgressBar.svelte";
  import ApiKeyGate from "$lib/components/ApiKeyGate.svelte";
  import { formatBytes, formatDateTime } from "$lib/utils/format";
  import {
    uploadFile,
    deleteFile,
    getDownloadUrl,
  } from "$lib/api/files";
  import {
    getFilesV2,
    embedFileV2,
    triggerExtraction,
    type FileItemV2,
    type ExtractionStatus,
  } from "$lib/api/files-v2";
  import { getCollections, addFilesToCollection, type Collection } from "$lib/api/collections";

  interface Props {
    data: {
      hasApiKey: boolean;
      apiKeyPrefix: string | null;
    };
  }

  let { data }: Props = $props();

  let hasApiKey = $state(data.hasApiKey);

  // Pagination state
  let files = $state<FileItemV2[]>([]);
  let nextCursor = $state<string | null>(null);
  let hasMore = $state(false);
  let loadingMore = $state(false);
  let loadingFiles = $state(false);

  let selectedFile = $state<File | null>(null);
  let uploading = $state(false);
  let uploadProgress = $state(0);
  let showDeleteConfirm = $state(false);
  let fileToDelete = $state<FileItemV2 | null>(null);
  let dragOver = $state(false);
  let uploadError = $state<string | null>(null);

  // Embedding state, keyed by file id
  let embedding = $state<Record<string, boolean>>({});
  let embedResult = $state<Record<string, string>>({});

  // Re-extract state
  let extracting = $state<Record<string, boolean>>({});

  // Add-to-collection modal
  let showCollectionModal = $state(false);
  let fileForCollection = $state<FileItemV2 | null>(null);
  let collections = $state<Collection[]>([]);
  let loadingCollections = $state(false);
  let addingToCollection = $state(false);
  let collectionAddError = $state<string | null>(null);
  let collectionAddedMessage = $state<string | null>(null);

  const canManage = $derived(
    $user?.role === "owner" || $user?.role === "admin",
  );

  // ── Data loading ─────────────────────────────────────────────────────────────
  // `verifyKey` is called by ApiKeyGate after verifying (including on mount
  // when a persisted key exists). This is the primary data-loading path.
  async function verifyKey(key: string) {
    const result = await getFilesV2(key, 100);
    files = result.files;
    nextCursor = result.nextCursor;
    hasMore = result.hasMore;
  }

  // Safety net: if the store is already verified when this page mounts
  // (e.g. navigating between dashboard pages client-side), load files directly
  // without waiting for ApiKeyGate's onMount to fire.
  onMount(async () => {
    if ($apiKeyVerified && $apiKey && files.length === 0) {
      await refreshFiles();
    }
  });

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    loadingMore = true;
    try {
      const result = await getFilesV2($apiKey, 100, nextCursor);
      files = [...files, ...result.files];
      nextCursor = result.nextCursor;
      hasMore = result.hasMore;
    } catch (error: any) {
      console.error("Failed to load more files:", error);
    } finally {
      loadingMore = false;
    }
  }

  async function refreshFiles() {
    if (!$apiKeyVerified || !$apiKey) return;
    loadingFiles = true;
    try {
      const result = await getFilesV2($apiKey, 100);
      files = result.files;
      nextCursor = result.nextCursor;
      hasMore = result.hasMore;
    } catch (error: any) {
      console.error("Failed to refresh files:", error);
    } finally {
      loadingFiles = false;
    }
  }

  async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length && $apiKeyVerified) {
      selectedFile = input.files[0];
      await uploadSelectedFile();
      input.value = "";
    }
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;

    if (!$apiKeyVerified) {
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
    if (!selectedFile || !$apiKeyVerified) return;

    uploading = true;
    uploadProgress = 0;
    uploadError = null;

    try {
      const uploaded = await uploadFile($apiKey, selectedFile, (pct) => {
        uploadProgress = pct;
      });

      files = [
        {
          id: uploaded.id,
          name: uploaded.name,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.sizeBytes,
          createdAt: uploaded.createdAt,
          extractionStatus: "pending",
        },
        ...files,
      ];

      selectedFile = null;
      uploadProgress = 0;

      setTimeout(refreshFiles, 1500);
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
    if (!fileToDelete || !$apiKey) return;

    try {
      await deleteFile($apiKey, fileToDelete.id);
      files = files.filter((f) => f.id !== fileToDelete!.id);
    } catch (error: any) {
      console.error("Delete failed:", error);
    } finally {
      showDeleteConfirm = false;
      fileToDelete = null;
    }
  }

  function confirmDelete(file: FileItemV2) {
    fileToDelete = file;
    showDeleteConfirm = true;
  }

  function downloadFile(file: FileItemV2) {
    if (!$apiKey) return;
    window.open(getDownloadUrl(file.id, $apiKey), "_blank");
  }

  async function handleExtract(file: FileItemV2) {
    extracting = { ...extracting, [file.id]: true };
    try {
      const result = await triggerExtraction($apiKey, file.id);
      files = files.map((f) =>
        f.id === file.id ? { ...f, extractionStatus: result.extractionStatus } : f,
      );
    } catch (error: any) {
      console.error("Extraction failed:", error);
    } finally {
      extracting = { ...extracting, [file.id]: false };
    }
  }

  async function handleEmbed(file: FileItemV2) {
    embedding = { ...embedding, [file.id]: true };
    try {
      const result = await embedFileV2($apiKey, file.id);
      embedResult = { ...embedResult, [file.id]: result.embeddingStatus };
    } catch (error: any) {
      embedResult = { ...embedResult, [file.id]: "failed" };
      console.error("Embedding failed:", error);
    } finally {
      embedding = { ...embedding, [file.id]: false };
    }
  }

  async function openCollectionModal(file: FileItemV2) {
    fileForCollection = file;
    showCollectionModal = true;
    collectionAddError = null;
    collectionAddedMessage = null;
    loadingCollections = true;
    try {
      collections = await getCollections($apiKey);
    } catch (error: any) {
      collectionAddError = error.message || "Failed to load collections";
    } finally {
      loadingCollections = false;
    }
  }

  async function handleAddToCollection(collectionId: string) {
    if (!fileForCollection) return;
    addingToCollection = true;
    collectionAddError = null;
    try {
      const result = await addFilesToCollection($apiKey, collectionId, [fileForCollection.id]);
      if (result.added === 0) {
        collectionAddedMessage = "Already in this collection";
      } else {
        collectionAddedMessage = "Added to collection";
        setTimeout(() => {
          showCollectionModal = false;
        }, 700);
      }
    } catch (error: any) {
      collectionAddError = error.message || "Failed to add file to collection";
    } finally {
      addingToCollection = false;
    }
  }

  function extractionBadgeVariant(status: ExtractionStatus): "default" | "success" | "warning" | "danger" | "info" {
    switch (status) {
      case "completed": return "success";
      case "failed": return "danger";
      case "pending":
      case "processing": return "warning";
      default: return "default";
    }
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
          You need at least one API key with read/write scope to manage files.
        </p>
        <a href="/dashboard/keys">
          <Button>Create API Key</Button>
        </a>
      </div>
    </Card>
  {:else}
    <ApiKeyGate verify={verifyKey} />

    {#if $apiKeyVerified}
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

      {#if loadingFiles}
        <Card>
          <div class="loading-state">
            <span class="loading-text">Loading files…</span>
          </div>
        </Card>
      {:else if files.length === 0}
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
                  <div class="file-name-row">
                    <span class="file-name">{file.name}</span>
                    <Badge variant={extractionBadgeVariant(file.extractionStatus)}>
                      {file.extractionStatus}
                    </Badge>
                    {#if embedResult[file.id]}
                      <Badge variant={embedResult[file.id] === 'completed' ? 'success' : embedResult[file.id] === 'failed' ? 'danger' : 'info'}>
                        embed: {embedResult[file.id]}
                      </Badge>
                    {/if}
                  </div>
                  <div class="file-meta">
                    <span>{formatBytes(file.sizeBytes)}</span>
                    <span>•</span>
                    <span>{file.mimeType}</span>
                    <span>•</span>
                    <span>{formatDateTime(file.createdAt)}</span>
                  </div>
                </div>
                <div class="file-actions">
                  {#if file.extractionStatus === 'failed' || file.extractionStatus === 'pending'}
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={extracting[file.id]}
                      onclick={() => handleExtract(file)}
                    >
                      Extract
                    </Button>
                  {/if}
                  {#if file.extractionStatus === 'completed'}
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={embedding[file.id]}
                      onclick={() => handleEmbed(file)}
                    >
                      Embed
                    </Button>
                  {/if}
                  <Button
                    variant="secondary"
                    size="sm"
                    onclick={() => openCollectionModal(file)}
                  >
                    + Collection
                  </Button>
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

          {#if hasMore}
            <div class="load-more">
              <Button
                variant="secondary"
                loading={loadingMore}
                onclick={loadMore}
              >
                {loadingMore ? "Loading..." : "Load more files"}
              </Button>
            </div>
          {/if}
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

<Modal
  bind:open={showCollectionModal}
  title="add to collection"
  onclose={() => (showCollectionModal = false)}
>
  {#if loadingCollections}
    <p class="modal-loading">Loading collections…</p>
  {:else if collections.length === 0}
    <p class="modal-empty">
      No collections yet.
      <a href="/dashboard/collections">Create one first</a>.
    </p>
  {:else}
    <div class="collection-pick-list">
      {#each collections as collection}
        <button
          class="collection-pick-row"
          disabled={addingToCollection}
          onclick={() => handleAddToCollection(collection.id)}
        >
          <span class="collection-pick-name">{collection.name}</span>
          <span class="collection-pick-count">{collection.fileCount} files</span>
        </button>
      {/each}
    </div>
  {/if}
  {#if collectionAddError}
    <div class="modal-error">// {collectionAddError}</div>
  {/if}
  {#if collectionAddedMessage}
    <div class="modal-success">✓ {collectionAddedMessage}</div>
  {/if}
</Modal>

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

  .loading-state {
    text-align: center;
    padding: var(--space-8) var(--space-4);
  }

  .loading-text {
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
    flex-wrap: wrap;
  }

  .file-info {
    flex: 1;
    min-width: 0;
  }

  .file-name-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
    flex-wrap: wrap;
  }

  .file-name {
    font-weight: 600;
    color: var(--color-text);
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
    flex-wrap: wrap;
  }

  .load-more {
    display: flex;
    justify-content: center;
    padding: var(--space-4) 0;
  }

  .modal-loading,
  .modal-empty {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .modal-empty a {
    color: var(--color-text-dim);
    text-decoration: underline;
  }

  .collection-pick-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-height: 280px;
    overflow-y: auto;
  }

  .collection-pick-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all 0.1s ease;
    text-align: left;
  }

  .collection-pick-row:hover:not(:disabled) {
    border-color: var(--color-border-hover);
    background: var(--color-bg-2);
  }

  .collection-pick-row:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .collection-pick-count {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }

  .modal-error {
    color: var(--color-danger);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    margin-top: var(--space-3);
  }

  .modal-success {
    color: var(--color-success);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    margin-top: var(--space-3);
  }

  @media (max-width: 640px) {
    .files-page {
      max-width: 100%;
    }

    .file-card {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-3);
    }

    .file-actions {
      width: 100%;
      justify-content: flex-end;
    }

    .file-meta {
      flex-wrap: wrap;
    }

    .upload-zone {
      padding: var(--space-5) var(--space-3);
    }
  }
</style>
