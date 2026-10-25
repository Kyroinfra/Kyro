<script lang="ts">
  import { page } from "$app/stores";
  import { apiKey, apiKeyVerified } from "$lib/stores/apiKey";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import ApiKeyGate from "$lib/components/ApiKeyGate.svelte";
  import { Search, Copy } from "$lib/components/icons";
  import { semanticSearch, type SemanticSearchResult } from "$lib/api/ask";
  import { getCollections, type Collection } from "$lib/api/collections";
  import { getFilesV2 } from "$lib/api/files";
  import { toast } from "$lib/stores/toast";
  import { onMount } from "svelte";

  interface Props {
    data: { hasApiKey: boolean };
  }

  let { data }: Props = $props();

  // ── Scope selection ─────────────────────────────────────────────────────────
  // /search resolves collection_id server-side (rag/scope.ts); file_ids exist
  // in the API but stay hidden here — the raw-response pane shows exactly what
  // went over the wire, which is what this page is for.
  type Scope = "org" | "collection";
  let scope = $state<Scope>("org");
  let collections = $state<Collection[]>([]);
  let selectedCollectionId = $state<string>("");
  let loadingCollections = $state(false);

  // ── Query state ─────────────────────────────────────────────────────────────
  const LIMITS = [5, 10, 25, 50]; // /search caps limit at 50
  let query = $state("");
  let limit = $state(10);
  let searching = $state(false);
  let results = $state<SemanticSearchResult[]>([]);
  let latencyMs = $state<number | null>(null);
  let rawResponse = $state<string | null>(null);

  let queryInput = $state<HTMLInputElement | undefined>(undefined);

  async function verifyKey(key: string) {
    await getFilesV2(key, 1);
    await loadCollections(key);
  }

  async function loadCollections(key = $apiKey) {
    loadingCollections = true;
    try {
      collections = await getCollections(key);
    } catch (error) {
      console.error("Failed to load collections:", error);
    } finally {
      loadingCollections = false;
    }
  }

  // Deep link: /dashboard/search?collectionId=… preselects the scope (same
  // convention as the ask page, so collection pages can link here).
  onMount(() => {
    const fromQuery = $page.url.searchParams.get("collectionId");
    if (fromQuery) {
      scope = "collection";
      selectedCollectionId = fromQuery;
    }
    queryInput?.focus();
  });

  async function handleSearch() {
    const q = query.trim();
    if (!q || searching) return;

    if (scope === "collection" && !selectedCollectionId) {
      toast.warning("Select a collection first.");
      return;
    }

    searching = true;
    const started = performance.now();
    try {
      const res = await semanticSearch($apiKey, q, {
        limit,
        ...(scope === "collection" ? { collectionId: selectedCollectionId } : {}),
      });
      latencyMs = performance.now() - started;
      results = res.data;
      rawResponse = JSON.stringify(res, null, 2);
    } catch (error: unknown) {
      latencyMs = null;
      results = [];
      rawResponse = null;
      const message =
        error instanceof Error ? error.message : "search request failed";
      toast.error(message);
    } finally {
      searching = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  }

  async function copyContent(content: string) {
    await navigator.clipboard.writeText(content);
    toast.success("Copied chunk content to clipboard.");
  }
</script>

<svelte:head>
  <title>Search - Kyro</title>
</svelte:head>

<div class="search-page">
  <header class="page-header">
    <div class="header-content">
      <span class="prompt">$</span>
      <span class="command">./search.sh</span>
    </div>
  </header>

  {#if !data.hasApiKey}
    <Card>
      <div class="empty-state">
        <span class="empty-icon">🔑</span>
        <h3>API Key Required</h3>
        <p>You need an API key with read scope to search over your files.</p>
        <a href="/dashboard/keys">
          <Button>Create API Key</Button>
        </a>
      </div>
    </Card>
  {:else}
    <ApiKeyGate verify={verifyKey} />

    {#if $apiKeyVerified}
      <Card padding="sm">
        <div class="scope-bar">
          <span class="scope-label">scope:</span>
          <div class="scope-toggle">
            <button
              class="scope-btn"
              class:active={scope === "org"}
              onclick={() => (scope = "org")}
            >
              whole org
            </button>
            <button
              class="scope-btn"
              class:active={scope === "collection"}
              onclick={() => (scope = "collection")}
            >
              collection
            </button>
          </div>
          {#if scope === "collection"}
            {#if loadingCollections}
              <span class="scope-loading">loading…</span>
            {:else if collections.length === 0}
              <span class="scope-empty">
                no collections — <a href="/dashboard/collections">create one</a>
              </span>
            {:else}
              <select class="scope-select" bind:value={selectedCollectionId}>
                <option value="" disabled>select a collection</option>
                {#each collections as c}
                  <option value={c.id}>{c.name} ({c.fileCount} files)</option>
                {/each}
              </select>
            {/if}
          {/if}

          <span class="scope-label">limit:</span>
          <select class="scope-select limit-select" bind:value={limit}>
            {#each LIMITS as n}
              <option value={n}>{n}</option>
            {/each}
          </select>
        </div>

        <div class="search-row">
          <input
            bind:this={queryInput}
            bind:value={query}
            class="search-input"
            type="text"
            placeholder="hybrid search over your chunks…"
            onkeydown={handleKeydown}
            disabled={searching}
          />
          <Button onclick={handleSearch} disabled={searching}>
            <span class="search-btn-label">
              <Search size={14} />
              {searching ? "searching…" : "search"}
            </span>
          </Button>
        </div>
      </Card>

      {#if results.length > 0 || latencyMs !== null}
        <div class="results-meta">
          <span class="meta-text">{results.length} results</span>
          {#if latencyMs !== null}
            <span class="meta-text">· {latencyMs.toFixed(0)} ms round trip</span>
          {/if}
        </div>
      {/if}

      {#if results.length > 0}
        <div class="results">
          {#each results as r}
            <Card padding="sm">
              <div class="result-head">
                <span class="result-file">{r.fileName}</span>
                <div class="result-tags">
                  {#if r.rerankScore !== undefined}
                    <Badge variant="info">rerank {r.rerankScore}</Badge>
                  {/if}
                  <Badge variant="success">rrf {r.rrfScore}</Badge>
                  <Badge variant="default">chunk {r.chunkIndex}</Badge>
                  <button
                    class="copy-btn"
                    title="copy chunk content"
                    onclick={() => copyContent(r.content)}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
              <pre class="result-content">{r.content.trim()}</pre>
            </Card>
          {/each}
        </div>
        <details class="raw-pane">
          <summary>raw response</summary>
          <pre class="raw-json">{rawResponse}</pre>
        </details>
      {:else if latencyMs !== null}
        <Card>
          <div class="no-results">
            <span class="empty-icon">◌</span>
            <p>No chunks matched this query — the vector arm's distance threshold
            and the full-text arm both came back empty.</p>
          </div>
        </Card>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .search-page {
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

  .empty-state h3 {
    margin: var(--space-3) 0 var(--space-2);
  }

  .empty-state p {
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
    font-size: var(--font-size-sm);
  }

  .empty-icon {
    font-size: 2rem;
  }

  .scope-bar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
    padding: var(--space-1) 0;
  }

  .scope-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .scope-toggle {
    display: flex;
    gap: 2px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 2px;
  }

  .scope-btn {
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

  .scope-btn:hover {
    color: var(--color-text-dim);
  }

  .scope-btn.active {
    background: var(--color-bg-3);
    color: var(--color-text);
  }

  .scope-select {
    padding: 4px var(--space-2);
    background: var(--color-bg);
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    max-width: 260px;
  }

  .limit-select {
    max-width: none;
  }

  .scope-loading {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .scope-empty {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .search-row {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }

  .search-input {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-border-active);
  }

  .search-btn-label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }

  .results-meta {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    margin: var(--space-4) 0 var(--space-2);
  }

  .meta-text {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .result-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .result-file {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .result-tags {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .copy-btn {
    display: inline-flex;
    align-items: center;
    padding: 3px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    cursor: pointer;
  }

  .copy-btn:hover {
    color: var(--color-text-dim);
    background: var(--color-bg-3);
  }

  .result-content {
    margin: var(--space-2) 0 0;
    padding: var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-dim);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 220px;
    overflow-y: auto;
  }

  .raw-pane {
    margin-top: var(--space-4);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .raw-pane summary {
    cursor: pointer;
    letter-spacing: 0.5px;
  }

  .raw-json {
    margin: var(--space-2) 0 0;
    padding: var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 420px;
    overflow-y: auto;
  }

  .no-results {
    text-align: center;
    padding: var(--space-6) var(--space-4);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }
</style>
