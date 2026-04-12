<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";
  import { user } from "$lib/stores/auth";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import { formatDate, formatDateTime } from "$lib/utils/format";

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
  let filter = $state<"all" | "active" | "revoked">("all");

  let newKey = $state<string | null>(form?.newKey || null);
  let keyName = $state("");
  let selectedScopes = $state<string[]>(["read"]);

  const canManage = $derived(
    $user?.role === "owner" || $user?.role === "admin",
  );

  const availableScopes = $derived(() => {
    if ($user?.role === 'owner' || $user?.role === 'admin') {
      return ['read', 'write', 'admin'];
    }
    return ['read'];
  });

  const filteredKeys = $derived(() => {
    if (filter === "active") return data.keys.filter((k) => !k.revokedAt);
    if (filter === "revoked") return data.keys.filter((k) => k.revokedAt);
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
      keyName = "";
      selectedScopes = ["read"];
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
    formData.append("id", keyToDelete);
    await fetch("?/delete", { method: "POST", body: formData });
    showDeleteConfirm = false;
    keyToDelete = null;
    window.location.reload();
  }
</script>

<svelte:head>
  <title>API Keys — Kyro</title>
</svelte:head>

<div class="keys-page">
  <header class="page-header">
    <div class="section-label">// api keys</div>
    {#if canManage}
      <Button onclick={() => (showCreateModal = true)}>+ new key</Button>
    {/if}
  </header>

  {#if newKey}
    <div class="key-reveal">
      <div class="key-reveal-header">
        <span class="key-reveal-title">key generated — copy now</span>
        <button class="dismiss-btn" onclick={dismissKey}>✕</button>
      </div>
      <p class="key-reveal-warning">// this value will not be shown again</p>
      <div class="key-value">
        <code>{newKey}</code>
        <Button variant="secondary" size="sm" onclick={handleCopy}>
          {copied ? "✓ copied" : "copy"}
        </Button>
      </div>
    </div>
  {/if}

  {#if data.keys.length === 0}
    <div class="empty-state">
      <span class="empty-prefix">$</span>
      <div class="empty-text">
        <span class="empty-cmd">ls ./keys</span>
        <span class="empty-result">// no keys found</span>
      </div>
      {#if canManage}
        <Button onclick={() => (showCreateModal = true)}
          >+ create first key</Button
        >
      {/if}
    </div>
  {:else}
    <div class="filter-tabs">
      {#each ["all", "active", "revoked"] as f}
        <button
          class="filter-tab"
          class:active={filter === f}
          onclick={() => (filter = f as any)}
        >
          {f}
        </button>
      {/each}
    </div>

    <div class="keys-list">
      {#each filteredKeys() as key}
        <div class="key-row" class:revoked={key.revokedAt}>
          <div class="key-main">
            <div class="key-name-row">
              <span class="key-name" class:strikethrough={key.revokedAt}
                >{key.name}</span
              >
              {#if key.revokedAt}
                <Badge variant="danger">revoked</Badge>
              {:else}
                <Badge variant="success">active</Badge>
              {/if}
            </div>
            <div class="key-prefix">key_{key.prefix}***</div>
            <div class="key-meta">
              <span>created {formatDate(key.createdAt)}</span>
              <span class="meta-sep">·</span>
              {#if key.lastUsedAt}
                <span>last used {formatDateTime(key.lastUsedAt)}</span>
              {:else}
                <span>never used</span>
              {/if}
              {#if key.revokedAt}
                <span class="meta-sep">·</span>
                <span class="revoked-date"
                  >revoked {formatDate(key.revokedAt)}</span
                >
              {/if}
            </div>
            <div class="key-scopes">
              {#each key.scopes as scope}
                <span class="scope-tag">{scope}</span>
              {/each}
            </div>
          </div>
          {#if canManage && !key.revokedAt}
            <Button
              variant="danger"
              size="sm"
              onclick={() => confirmDelete(key.id)}
            >
              revoke
            </Button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<Modal
  bind:open={showCreateModal}
  title="create api key"
  onclose={() => (showCreateModal = false)}
>
  <form
    method="POST"
    action="?/create"
    use:enhance={() => {
      handleCreateSubmit();
      return async ({ result }) => {
        if (result.type === "success") {
          const data = (result as any).data;
          handleKeyCreated(data || {});
        } else if (result.type === "failure") {
          const data = (result as any).data;
          createError = data?.error
            ? String(data.error)
            : "Failed to create key";
          creating = false;
        }
      };
    }}
  >
    <div class="form-group">
      <label for="key-name">name</label>
      <input
        type="text"
        id="key-name"
        name="name"
        bind:value={keyName}
        placeholder="my-api-key"
        required
      />
    </div>

    <div class="form-group">
      <label>scopes</label>
      <div class="scopes-grid">
        {#each availableScopes() as scope}
          <label class="scope-checkbox">
            <input
              type="checkbox"
              name="scopes"
              value={scope}
              bind:group={selectedScopes}
            />
            <span>{scope}</span>
          </label>
        {/each}
      </div>
    </div>

    {#if createError}
      <div class="error-message">// {createError}</div>
    {/if}

    <div class="form-actions">
      <Button variant="secondary" onclick={() => (showCreateModal = false)}
        >cancel</Button
      >
      <Button type="submit" loading={creating}>create key</Button>
    </div>
  </form>
</Modal>

<ConfirmDialog
  bind:open={showDeleteConfirm}
  title="revoke api key"
  message="Are you sure you want to revoke this API key? Any applications using this key will stop working immediately."
  confirmLabel="Revoke"
  variant="danger"
  onconfirm={handleDelete}
  oncancel={() => (showDeleteConfirm = false)}
/>

<style>
  .keys-page {
    max-width: 880px;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-5);
  }

  .section-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-ghost);
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }

  /* Key reveal banner */
  .key-reveal {
    background: var(--color-bg-2);
    border: 1px solid var(--color-warning-border);
    border-left: 3px solid var(--color-warning);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-5);
    margin-bottom: var(--space-5);
  }

  .key-reveal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }

  .key-reveal-title {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text);
  }

  .dismiss-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    cursor: pointer;
    padding: var(--space-1);
  }

  .dismiss-btn:hover {
    color: var(--color-text-dim);
  }

  .key-reveal-warning {
    color: var(--color-warning);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
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
    font-size: var(--font-size-xs);
    color: var(--color-text);
    word-break: break-all;
    border: 1px solid var(--color-border-2);
  }

  /* Empty state */
  .empty-state {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-8) var(--space-5);
    background: var(--color-bg-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .empty-prefix {
    font-family: var(--font-mono);
    color: var(--color-success);
    font-weight: 700;
    font-size: var(--font-size-lg);
  }

  .empty-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .empty-cmd {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text-dim);
  }

  .empty-result {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-ghost);
  }

  /* Filters */
  .filter-tabs {
    display: flex;
    gap: 2px;
    margin-bottom: var(--space-4);
    background: var(--color-bg-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 3px;
    width: fit-content;
  }

  .filter-tab {
    padding: 4px var(--space-3);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .filter-tab:hover {
    color: var(--color-text-dim);
  }

  .filter-tab.active {
    background: var(--color-bg-3);
    color: var(--color-text);
    border: 1px solid var(--color-border-2);
  }

  /* Keys list */
  .keys-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .key-row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
    background: var(--color-bg-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    transition: border-color 0.1s ease;
  }

  .key-row:hover {
    border-color: var(--color-border-2);
  }

  .key-row.revoked {
    opacity: 0.5;
  }

  .key-main {
    flex: 1;
    min-width: 0;
  }

  .key-name-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .key-name {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .key-name.strikethrough {
    text-decoration: line-through;
    color: var(--color-text-muted);
  }

  .key-prefix {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-ghost);
    margin-bottom: var(--space-2);
  }

  .key-meta {
    display: flex;
    gap: var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-ghost);
    margin-bottom: var(--space-2);
  }

  .meta-sep {
    color: var(--color-border-hover);
  }

  .revoked-date {
    color: var(--color-danger);
    opacity: 0.6;
  }

  .key-scopes {
    display: flex;
    gap: var(--space-2);
  }

  .scope-tag {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-ghost);
    background: var(--color-bg-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 1px 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Form */
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

  .form-group input[type="text"] {
    width: 100%;
    height: 36px;
    padding: 0 var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    outline: none;
    transition: border-color 0.1s ease;
  }

  .form-group input[type="text"]:focus {
    border-color: var(--color-border-active);
  }

  .scopes-grid {
    display: flex;
    gap: var(--space-4);
  }

  .scope-checkbox {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
  }

  .scope-checkbox input {
    width: 14px;
    height: 14px;
    accent-color: var(--color-text);
  }

  .scope-checkbox span {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-dim);
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
    .keys-page {
      max-width: 100%;
    }

    .page-header {
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .key-row {
      flex-wrap: wrap;
      padding: var(--space-3);
    }

    .key-reveal {
      padding: var(--space-3);
    }

    .key-value {
      flex-direction: column;
      align-items: stretch;
    }

    .key-value code {
      font-size: 10px;
      word-break: break-all;
    }

    .filter-tabs {
      width: 100%;
      overflow-x: auto;
    }

    .empty-state {
      flex-wrap: wrap;
      padding: var(--space-5) var(--space-3);
    }
  }
</style>
