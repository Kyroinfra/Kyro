<script lang="ts">
  import { apiKey, apiKeyVerified } from "$lib/stores/apiKey";
  import { user } from "$lib/stores/auth";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import ApiKeyGate from "$lib/components/ApiKeyGate.svelte";
  import { formatBytes, formatDate, formatDateTime } from "$lib/utils/format";
  import {
    getCollection,
    getCollectionFiles,
    addFilesToCollection,
    removeFileFromCollection,
    updateCollection,
    deleteCollection,
    type CollectionDetail,
    type CollectionFile,
  } from "$lib/api/collections";
  import { getFilesV2, type FileItemV2 } from "$lib/api/files-v2";
  import { goto } from "$app/navigation";

  interface Props {
    data: { hasApiKey: boolean; collectionId: string };
  }

  let { data }: Props = $props();

  let collection = $state<CollectionDetail | null>(null);
  let collectionFiles = $state<CollectionFile[]>([]);
  let loading = $state(false);
  let loadError = $state<string | null>(null);

  const canManage = $derived(
    $user?.role === "owner" || $user?.role === "admin",
  );

  async function verifyKey(key: string) {
    await loadAll(key);
  }

  async function loadAll(key = $apiKey) {
    loading = true;
    loadError = null;
    try {
      const [detail, filesPage] = await Promise.all([
        getCollection(key, data.collectionId),
        getCollectionFiles(key, data.collectionId, 100, 0),
      ]);
      collection = detail;
      collectionFiles = filesPage.data;
    } catch (error: any) {
      loadError = error.message || "Failed to load collection";
    } finally {
      loading = false;
    }
  }

  // ── Edit modal ──────────────────────────────────────────────────────────────
  let showEditModal = $state(false);
  let editName = $state("");
  let editDescription = $state("");
  let savingEdit = $state(false);
  let editError = $state<string | null>(null);

  function openEdit() {
    if (!collection) return;
    editName = collection.name;
    editDescription = collection.description || "";
    editError = null;
    showEditModal = true;
  }

  async function saveEdit() {
    if (!collection) return;
    if (!editName.trim()) {
      editError = "Name is required";
      return;
    }
    savingEdit = true;
    editError = null;
    try {
      await updateCollection($apiKey, collection.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      showEditModal = false;
      await loadAll();
    } catch (error: any) {
      editError = error.message || "Failed to update collection";
    } finally {
      savingEdit = false;
    }
  }

  // ── Delete collection ───────────────────────────────────────────────────────
  let showDeleteConfirm = $state(false);

  async function handleDeleteCollection() {
    if (!collection) return;
    try {
      await deleteCollection($apiKey, collection.id);
      goto("/dashboard/collections");
    } catch (error: any) {
      console.error("Failed to delete collection:", error);
    } finally {
      showDeleteConfirm = false;
    }
  }

  // ── Add files modal ─────────────────────────────────────────────────────────
  let showAddFilesModal = $state(false);
  let orgFiles = $state<FileItemV2[]>([]);
  let loadingOrgFiles = $state(false);
  let selectedFileIds = $state<Set<string>>(new Set());
  let addingFiles = $state(false);
  let addFilesError = $state<string | null>(null);

  async function openAddFiles() {
    showAddFilesModal = true;
    addFilesError = null;
    selectedFileIds = new Set();
    loadingOrgFiles = true;
    try {
      const result = await getFilesV2($apiKey, 100);
      const existingIds = new Set(collectionFiles.map((f) => f.id));
      orgFiles = result.files.filter((f) => !existingIds.has(f.id));
    } catch (error: any) {
      addFilesError = error.message || "Failed to load files";
    } finally {
      loadingOrgFiles = false;
    }
  }

  function toggleFileSelection(id: string) {
    const next = new Set(selectedFileIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedFileIds = next;
  }

  async function handleAddSelectedFiles() {
    if (!collection || selectedFileIds.size === 0) return;
    addingFiles = true;
    addFilesError = null;
    try {
      await addFilesToCollection($apiKey, collection.id, Array.from(selectedFileIds));
      showAddFilesModal = false;
      await loadAll();
    } catch (error: any) {
      addFilesError = error.message || "Failed to add files";
    } finally {
      addingFiles = false;
    }
  }

  // ── Remove file from collection ─────────────────────────────────────────────
  let fileToRemove = $state<CollectionFile | null>(null);
  let showRemoveConfirm = $state(false);

  function confirmRemove(file: CollectionFile) {
    fileToRemove = file;
    showRemoveConfirm = true;
  }

  async function handleRemoveFile() {
    if (!collection || !fileToRemove) return;
    try {
      await removeFileFromCollection($apiKey, collection.id, fileToRemove.id);
      collectionFiles = collectionFiles.filter((f) => f.id !== fileToRemove!.id);
      await loadAll();
    } catch (error: any) {
      console.error("Failed to remove file:", error);
    } finally {
      showRemoveConfirm = false;
      fileToRemove = null;
    }
  }

  function embedBadgeVariant(status: string): "success" | "warning" | "danger" | "default" {
    if (status === "completed") return "success";
    if (status === "failed") return "danger";
    if (status === "pending" || status === "embedding") return "warning";
    return "default";
  }
</script>

<svelte:head>
  <title>{collection?.name || "Collection"} - Kyro</title>
</svelte:head>

<div class="collection-detail-page">
  <header class="page-header">
    <div class="header-content">
      <a href="/dashboard/collections" class="back-link">← collections</a>
    </div>
  </header>

  {#if !data.hasApiKey}
    <Card>
      <div class="empty-state">
        <span class="empty-icon">🔑</span>
        <h3>API Key Required</h3>
        <p>You need an API key with read/write scope to view this collection.</p>
        <a href="/dashboard/keys">
          <Button>Create API Key</Button>
        </a>
      </div>
    </Card>
  {:else}
    <ApiKeyGate verify={verifyKey} />

    {#if $apiKeyVerified}
      {#if loading}
        <Card><p class="loading-text">Loading collection…</p></Card>
      {:else if loadError}
        <Card><p class="error-text">// {loadError}</p></Card>
      {:else if collection}
        <Card>
          <div class="collection-header">
            <div class="collection-header-main">
              <h1 class="collection-title">{collection.name}</h1>
              {#if collection.description}
                <p class="collection-description">{collection.description}</p>
              {/if}
              <div class="collection-meta">
                <span class="slug">/{collection.slug}</span>
                <span>•</span>
                <span>created {formatDate(collection.createdAt)}</span>
              </div>
            </div>
            {#if canManage}
              <div class="collection-header-actions">
                <Button variant="secondary" size="sm" onclick={openEdit}>Edit</Button>
                <Button variant="danger" size="sm" onclick={() => (showDeleteConfirm = true)}>
                  Delete
                </Button>
              </div>
            {/if}
          </div>

          <div class="status-row">
            <Badge variant={collection.queryReady ? "success" : "warning"}>
              {collection.queryReady ? "query ready" : "embedding in progress"}
            </Badge>
            <span class="status-stat">{collection.fileCount} files</span>
            <span class="status-stat">{collection.embeddedCount} embedded</span>
            {#if collection.pendingCount > 0}
              <span class="status-stat">{collection.pendingCount} pending</span>
            {/if}
            {#if collection.failedCount > 0}
              <span class="status-stat status-stat-danger">{collection.failedCount} failed</span>
            {/if}
          </div>

          <div class="quick-actions">
            <a href="/dashboard/ask?collectionId={collection.id}">
              <Button variant="secondary" size="sm">Ask this collection</Button>
            </a>
          </div>
        </Card>

        <div class="files-section-header">
          <span class="section-label">// Files in this collection</span>
          {#if canManage}
            <Button size="sm" onclick={openAddFiles}>+ add files</Button>
          {/if}
        </div>

        {#if collectionFiles.length === 0}
          <Card>
            <div class="empty-state">
              <span class="empty-icon">📁</span>
              <h3>No files in this collection</h3>
              <p>Add files from your organisation to build this collection.</p>
              {#if canManage}
                <Button onclick={openAddFiles}>+ add files</Button>
              {/if}
            </div>
          </Card>
        {:else}
          <div class="files-list">
            {#each collectionFiles as file}
              <Card>
                <div class="file-row">
                  <div class="file-info">
                    <div class="file-name-row">
                      <span class="file-name">{file.name}</span>
                      <Badge variant={embedBadgeVariant(file.embeddingStatus)}>
                        {file.embeddingStatus}
                      </Badge>
                    </div>
                    <div class="file-meta">
                      <span>{formatBytes(file.sizeBytes)}</span>
                      <span>•</span>
                      <span>{file.mimeType}</span>
                      <span>•</span>
                      <span>added {formatDateTime(String(file.addedAt))}</span>
                    </div>
                  </div>
                  {#if canManage}
                    <Button variant="danger" size="sm" onclick={() => confirmRemove(file)}>
                      Remove
                    </Button>
                  {/if}
                </div>
              </Card>
            {/each}
          </div>
        {/if}
      {/if}
    {/if}
  {/if}
</div>

<!-- Edit collection modal -->
<Modal bind:open={showEditModal} title="edit collection" onclose={() => (showEditModal = false)}>
  <div class="form-group">
    <label for="edit-name">name</label>
    <input type="text" id="edit-name" bind:value={editName} />
  </div>
  <div class="form-group">
    <label for="edit-description">description</label>
    <textarea id="edit-description" bind:value={editDescription} rows="3"></textarea>
  </div>
  {#if editError}
    <div class="error-message">// {editError}</div>
  {/if}
  <div class="form-actions">
    <Button variant="secondary" onclick={() => (showEditModal = false)}>cancel</Button>
    <Button onclick={saveEdit} loading={savingEdit}>save</Button>
  </div>
</Modal>

<!-- Add files modal -->
<Modal bind:open={showAddFilesModal} title="add files" onclose={() => (showAddFilesModal = false)}>
  {#if loadingOrgFiles}
    <p class="modal-loading">Loading files…</p>
  {:else if orgFiles.length === 0}
    <p class="modal-empty">
      No more files to add — every file in your organisation is already in this collection,
      or you have no files yet. <a href="/dashboard/files">Upload files</a>.
    </p>
  {:else}
    <div class="file-pick-list">
      {#each orgFiles as file}
        <label class="file-pick-row">
          <input
            type="checkbox"
            checked={selectedFileIds.has(file.id)}
            onchange={() => toggleFileSelection(file.id)}
          />
          <span class="file-pick-name">{file.name}</span>
          <span class="file-pick-size">{formatBytes(file.sizeBytes)}</span>
        </label>
      {/each}
    </div>
  {/if}
  {#if addFilesError}
    <div class="error-message">// {addFilesError}</div>
  {/if}
  <div class="form-actions">
    <Button variant="secondary" onclick={() => (showAddFilesModal = false)}>cancel</Button>
    <Button
      onclick={handleAddSelectedFiles}
      loading={addingFiles}
      disabled={selectedFileIds.size === 0}
    >
      add {selectedFileIds.size > 0 ? `(${selectedFileIds.size})` : ""}
    </Button>
  </div>
</Modal>

<ConfirmDialog
  bind:open={showRemoveConfirm}
  title="Remove File"
  message="Remove {fileToRemove?.name} from this collection? The file itself will not be deleted."
  confirmLabel="Remove"
  variant="danger"
  onconfirm={handleRemoveFile}
  oncancel={() => (showRemoveConfirm = false)}
/>

<ConfirmDialog
  bind:open={showDeleteConfirm}
  title="Delete Collection"
  message="Are you sure you want to delete '{collection?.name}'? Files themselves will not be deleted, only the grouping."
  confirmLabel="Delete"
  variant="danger"
  onconfirm={handleDeleteCollection}
  oncancel={() => (showDeleteConfirm = false)}
/>

<style>
  .collection-detail-page {
    max-width: 900px;
  }

  .page-header {
    margin-bottom: var(--space-5);
  }

  .back-link {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .back-link:hover {
    color: var(--color-text);
  }

  .empty-state {
    text-align: center;
    padding: var(--space-8) var(--space-4);
  }

  .empty-icon {
    display: block;
    margin-bottom: var(--space-3);
    font-size: 24px;
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

  .loading-text,
  .error-text {
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    text-align: center;
    padding: var(--space-4);
  }

  .error-text {
    color: var(--color-danger);
  }

  .collection-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .collection-title {
    font-family: var(--font-mono);
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 var(--space-2);
  }

  .collection-description {
    color: var(--color-text-dim);
    font-size: var(--font-size-sm);
    margin: 0 0 var(--space-2);
  }

  .collection-meta {
    display: flex;
    gap: var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-ghost);
  }

  .collection-header-actions {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .status-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
    flex-wrap: wrap;
  }

  .status-stat {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .status-stat-danger {
    color: var(--color-danger);
  }

  .quick-actions {
    margin-top: var(--space-3);
  }

  .files-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: var(--space-5) 0 var(--space-3);
  }

  .section-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .files-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .file-row {
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

  .form-group {
    margin-bottom: var(--space-4);
  }

  .form-group label {
    display: block;
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: var(--space-2);
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    outline: none;
    transition: border-color 0.1s ease;
    resize: vertical;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    border-color: var(--color-border-active);
  }

  .error-message {
    color: var(--color-danger);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    margin-bottom: var(--space-3);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    margin-top: var(--space-5);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
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

  .file-pick-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-height: 320px;
    overflow-y: auto;
  }

  .file-pick-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .file-pick-row:hover {
    border-color: var(--color-border-hover);
  }

  .file-pick-row input[type="checkbox"] {
    width: 14px;
    height: 14px;
    accent-color: var(--color-text);
    flex-shrink: 0;
  }

  .file-pick-name {
    flex: 1;
    color: var(--color-text);
    word-break: break-all;
  }

  .file-pick-size {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    flex-shrink: 0;
  }

  @media (max-width: 640px) {
    .collection-detail-page {
      max-width: 100%;
    }

    .collection-header {
      flex-direction: column;
    }

    .file-row {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
