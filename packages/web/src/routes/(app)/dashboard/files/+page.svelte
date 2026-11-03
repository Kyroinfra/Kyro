<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from "$lib/stores/auth";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import ProgressBar from "$lib/components/ui/ProgressBar.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import { formatBytes, formatDateTime } from "$lib/utils/format";
  import {
    uploadFile,
    deleteFile,
    getDownloadUrl,
    getFilesV2,
    reprocessFile,
    type FileItemV2,
    type FileStatus,
  } from "$lib/api/files";
  import { getCollections, addFilesToCollection, type Collection } from "$lib/api/collections";

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
  // First page loads on mount (#42) — the session cookie authenticates; no
  // key gate to pass first.
  onMount(() => {
    void refreshFiles();
    // Leave no background timers behind (#45).
    return () => stopPolling();
  });

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    loadingMore = true;
    try {
      const result = await getFilesV2(100, nextCursor);
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
    loadingFiles = true;
    try {
      const result = await getFilesV2(100);
      files = result.files;
      nextCursor = result.nextCursor;
      hasMore = result.hasMore;
      // Resume polling when a load lands mid-pipeline (#45).
      if (!document.hidden && inFlight()) startPolling();
    } catch (error: any) {
      console.error("Failed to refresh files:", error);
    } finally {
      loadingFiles = false;
    }
  }

  // ── In-flight polling (#45) ──────────────────────────────────────────────────
  // While any listed file is pending/processing, poll every 3s and patch the
  // new status/error in place. The patch is deliberately not a full refresh —
  // it must not clobber load-more pagination or flash the loading spinner.
  // Polling stops when everything is settled, on page hide, and on unmount.
  const POLL_INTERVAL = 3000;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let pollBusy = false;

  function inFlight() {
    return files.some(
      (f) => f.status === "pending" || f.status === "processing",
    );
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(pollTick, POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollTimer === null) return;
    clearInterval(pollTimer);
    pollTimer = null;
  }

  async function pollTick() {
    if (pollBusy) return;
    if (!inFlight()) {
      stopPolling();
      return;
    }
    pollBusy = true;
    try {
      const result = await getFilesV2(100);
      const updates = new Map(result.files.map((u) => [u.id, u]));
      files = files.map((f) => {
        const u = updates.get(f.id);
        return u ? { ...f, status: u.status, error: u.error } : f;
      });
    } catch (error: any) {
      // Transient failures keep polling; the next tick retries.
      console.error("Failed to poll file statuses:", error);
    } finally {
      pollBusy = false;
      if (!inFlight()) stopPolling();
    }
  }

  function handleVisibilityChange() {
    // Stop on page hide; catch up immediately on return.
    if (document.hidden) {
      stopPolling();
      return;
    }
    if (inFlight()) void pollTick();
    startPolling();
  }

  async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) {
      selectedFile = input.files[0];
      await uploadSelectedFile();
      input.value = "";
    }
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;

    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles?.length) {
      selectedFile = droppedFiles[0];
      await uploadSelectedFile();
    }
  }

  async function uploadSelectedFile() {
    if (!selectedFile) return;

    uploading = true;
    uploadProgress = 0;
    uploadError = null;

    try {
      const uploaded = await uploadFile(selectedFile, (pct) => {
        uploadProgress = pct;
      });

      files = [
        {
          id: uploaded.id,
          name: uploaded.name,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.sizeBytes,
          createdAt: uploaded.createdAt,
          status: uploaded.status,
        },
        ...files,
      ];

      selectedFile = null;
      uploadProgress = 0;

      // The new row starts pending — poll until the pipeline settles (#45).
      startPolling();
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
    if (!fileToDelete) return;

    try {
      await deleteFile(fileToDelete.id);
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
    window.open(getDownloadUrl(file.id), "_blank");
  }

  async function handleReprocess(file: FileItemV2) {
    try {
      const result = await reprocessFile(file.id);
      // The row resets to pending; drop the stale error and poll until the
      // pipeline settles (#45).
      files = files.map((f) => {
        if (f.id !== file.id) return f;
        const { error: _stale, ...rest } = f;
        return { ...rest, status: result.status };
      });
      startPolling();
    } catch (error: any) {
      console.error("Reprocess failed:", error);
    }
  }

  async function openCollectionModal(file: FileItemV2) {
    fileForCollection = file;
    showCollectionModal = true;
    collectionAddError = null;
    collectionAddedMessage = null;
    loadingCollections = true;
    try {
      collections = await getCollections();
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
      const result = await addFilesToCollection(collectionId, [fileForCollection.id]);
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

  function statusBadgeVariant(status: FileStatus): "default" | "success" | "warning" | "danger" | "info" {
    switch (status) {
      case "ready": return "success";
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

<svelte:document onvisibilitychange={handleVisibilityChange} />

<div class="files-page">
  <PageHeader command="files.sh" />

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
        <EmptyState
          icon="📁"
          title="No files yet"
          hint="Upload your first file to get started."
        />
      </Card>
    {:else}
      <div class="files-list">
        {#each files as file}
          <Card>
            <div class="file-card">
              <div class="file-info">
                <div class="file-name-row">
                  <span class="file-name">{file.name}</span>
                  {#if file.status === "failed" && file.error}
                    <span class="failed-badge" title={file.error}>
                      <Badge variant="danger">{file.status}</Badge>
                    </span>
                  {:else}
                    <Badge variant={statusBadgeVariant(file.status)}>
                      {file.status}
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
                {#if file.status !== 'processing' && file.status !== 'pending'}
                  <Button
                    variant="secondary"
                    size="sm"
                    onclick={() => handleReprocess(file)}
                  >
                    Reprocess
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

  /* Failed badge carrier — carries the file.error tooltip (#45). */
  .failed-badge {
    display: inline-flex;
    cursor: help;
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
