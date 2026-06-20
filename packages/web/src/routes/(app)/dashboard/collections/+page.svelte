<script lang="ts">
  import { apiKey, apiKeyVerified } from "$lib/stores/apiKey";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import ApiKeyGate from "$lib/components/ApiKeyGate.svelte";
  import { formatDate } from "$lib/utils/format";
  import {
    getCollections,
    createCollection,
    type Collection,
  } from "$lib/api/collections";
  import { getFilesV2 } from "$lib/api/files-v2";

  interface Props {
    data: { hasApiKey: boolean };
  }

  let { data }: Props = $props();

  let collections = $state<Collection[]>([]);
  let loadingCollections = $state(false);
  let loadError = $state<string | null>(null);

  let showCreateModal = $state(false);
  let newName = $state("");
  let newDescription = $state("");
  let creating = $state(false);
  let createError = $state<string | null>(null);

  async function verifyKey(key: string) {
    // read-scope smoke test, then load real data
    await getFilesV2(key, 1);
    await refreshCollections(key);
  }

  async function refreshCollections(key = $apiKey) {
    loadingCollections = true;
    loadError = null;
    try {
      collections = await getCollections(key);
    } catch (error: any) {
      loadError = error.message || "Failed to load collections";
    } finally {
      loadingCollections = false;
    }
  }

  async function handleCreate() {
    if (!newName.trim()) {
      createError = "Name is required";
      return;
    }
    creating = true;
    createError = null;
    try {
      await createCollection($apiKey, {
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      });
      newName = "";
      newDescription = "";
      showCreateModal = false;
      await refreshCollections();
    } catch (error: any) {
      createError = error.message || "Failed to create collection";
    } finally {
      creating = false;
    }
  }

  function statusBadge(c: Collection): { variant: "success" | "warning" | "danger" | "default"; label: string } {
    if (c.fileCount === 0) return { variant: "default", label: "empty" };
    if (c.failedCount > 0) return { variant: "danger", label: `${c.failedCount} failed` };
    if (c.embeddedCount === c.fileCount) return { variant: "success", label: "ready" };
    return { variant: "warning", label: "embedding" };
  }
</script>

<svelte:head>
  <title>Collections - Kyro</title>
</svelte:head>

<div class="collections-page">
  <header class="page-header">
    <div class="header-content">
      <span class="prompt">$</span>
      <span class="command">./collections.sh</span>
    </div>
    {#if $apiKeyVerified}
      <Button onclick={() => (showCreateModal = true)}>+ new collection</Button>
    {/if}
  </header>

  {#if !data.hasApiKey}
    <Card>
      <div class="empty-state">
        <span class="empty-icon">🔑</span>
        <h3>API Key Required</h3>
        <p>You need at least one API key with read/write scope to manage collections.</p>
        <a href="/dashboard/keys">
          <Button>Create API Key</Button>
        </a>
      </div>
    </Card>
  {:else}
    <ApiKeyGate verify={verifyKey} />

    {#if $apiKeyVerified}
      {#if loadingCollections}
        <Card>
          <p class="loading-text">Loading collections…</p>
        </Card>
      {:else if loadError}
        <Card>
          <p class="error-text">// {loadError}</p>
        </Card>
      {:else if collections.length === 0}
        <Card>
          <div class="empty-state">
            <span class="empty-icon">🗂️</span>
            <h3>No collections yet</h3>
            <p>
              Collections group files together so you can scope semantic
              search and the Ask endpoint to a specific set of documents.
            </p>
            <Button onclick={() => (showCreateModal = true)}>+ create first collection</Button>
          </div>
        </Card>
      {:else}
        <div class="collections-grid">
          {#each collections as collection}
            {@const status = statusBadge(collection)}
            <a href="/dashboard/collections/{collection.id}" class="collection-card-link">
              <Card>
                <div class="collection-card">
                  <div class="collection-card-header">
                    <span class="collection-name">{collection.name}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  {#if collection.description}
                    <p class="collection-desc">{collection.description}</p>
                  {/if}
                  <div class="collection-stats">
                    <span class="stat">
                      <span class="stat-value">{collection.fileCount}</span>
                      <span class="stat-label">files</span>
                    </span>
                    <span class="stat">
                      <span class="stat-value">{collection.embeddedCount}</span>
                      <span class="stat-label">embedded</span>
                    </span>
                    {#if collection.pendingCount > 0}
                      <span class="stat">
                        <span class="stat-value">{collection.pendingCount}</span>
                        <span class="stat-label">pending</span>
                      </span>
                    {/if}
                  </div>
                  <div class="collection-footer">
                    <span class="collection-slug">/{collection.slug}</span>
                    <span class="collection-date">created {formatDate(collection.createdAt)}</span>
                  </div>
                </div>
              </Card>
            </a>
          {/each}
        </div>
      {/if}
    {/if}
  {/if}
</div>

<Modal
  bind:open={showCreateModal}
  title="create collection"
  onclose={() => (showCreateModal = false)}
>
  <div class="form-group">
    <label for="collection-name">name</label>
    <input
      type="text"
      id="collection-name"
      bind:value={newName}
      placeholder="e.g. Q3 Contracts"
      onkeydown={(e) => e.key === "Enter" && handleCreate()}
    />
  </div>
  <div class="form-group">
    <label for="collection-description">description (optional)</label>
    <textarea
      id="collection-description"
      bind:value={newDescription}
      placeholder="What is this collection for?"
      rows="3"
    ></textarea>
  </div>

  {#if createError}
    <div class="error-message">// {createError}</div>
  {/if}

  <div class="form-actions">
    <Button variant="secondary" onclick={() => (showCreateModal = false)}>cancel</Button>
    <Button onclick={handleCreate} loading={creating}>create</Button>
  </div>
</Modal>

<style>
  .collections-page {
    max-width: 980px;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-5);
    flex-wrap: wrap;
    gap: var(--space-3);
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
    max-width: 420px;
    margin-left: auto;
    margin-right: auto;
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

  .collections-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--space-3);
  }

  .collection-card-link {
    text-decoration: none;
    display: block;
  }

  .collection-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .collection-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .collection-name {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .collection-desc {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    line-height: 1.5;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .collection-stats {
    display: flex;
    gap: var(--space-4);
    margin-top: var(--space-1);
  }

  .stat {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--color-text);
  }

  .stat-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-ghost);
    text-transform: uppercase;
  }

  .collection-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border);
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-ghost);
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

  @media (max-width: 640px) {
    .collections-page {
      max-width: 100%;
    }

    .collections-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
