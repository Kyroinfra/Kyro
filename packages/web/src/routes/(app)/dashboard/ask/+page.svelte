<script lang="ts">
  import { page } from "$app/stores";
  import { apiKey, apiKeyVerified } from "$lib/stores/apiKey";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import ApiKeyGate from "$lib/components/ApiKeyGate.svelte";
  import { Send } from "$lib/components/icons";
  import { askStream, type AskSource } from "$lib/api/ask";
  import { getCollections, type Collection } from "$lib/api/collections";
  import { getFilesV2 } from "$lib/api/files-v2";
  import { onMount } from "svelte";

  interface Props {
    data: { hasApiKey: boolean };
  }

  let { data }: Props = $props();

  interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    sources?: AskSource[];
    error?: string;
    streaming?: boolean;
  }

  let messages = $state<ChatMessage[]>([]);
  let question = $state("");
  let asking = $state(false);
  let scrollAnchor: HTMLDivElement | undefined;

  // ── Scope selection ─────────────────────────────────────────────────────────
  type Scope = "org" | "collection";
  let scope = $state<Scope>("org");
  let collections = $state<Collection[]>([]);
  let selectedCollectionId = $state<string>("");
  let loadingCollections = $state(false);

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

  onMount(() => {
    const fromQuery = $page.url.searchParams.get("collectionId");
    if (fromQuery) {
      scope = "collection";
      selectedCollectionId = fromQuery;
    }
  });

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollAnchor?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }

  async function handleAsk() {
    const q = question.trim();
    if (!q || asking) return;

    if (scope === "collection" && !selectedCollectionId) {
      messages = [
        ...messages,
        { role: "assistant", content: "", error: "Select a collection first." },
      ];
      return;
    }

    messages = [...messages, { role: "user", content: q }];
    question = "";
    asking = true;
    scrollToBottom();

    const assistantMsg: ChatMessage = { role: "assistant", content: "", streaming: true };
    messages = [...messages, assistantMsg];
    const msgIndex = messages.length - 1;

    try {
      await askStream(
        $apiKey,
        {
          question: q,
          ...(scope === "collection" ? { collectionId: selectedCollectionId } : {}),
        },
        {
          onSources: (sources) => {
            messages[msgIndex] = { ...messages[msgIndex], sources };
            messages = [...messages];
          },
          onChunk: (text) => {
            messages[msgIndex] = {
              ...messages[msgIndex],
              content: messages[msgIndex].content + text,
            };
            messages = [...messages];
            scrollToBottom();
          },
          onError: (message) => {
            messages[msgIndex] = { ...messages[msgIndex], error: message, streaming: false };
            messages = [...messages];
          },
        },
      );
    } catch (error: any) {
      messages[msgIndex] = {
        ...messages[msgIndex],
        error: error.message || "Request failed",
        streaming: false,
      };
      messages = [...messages];
    } finally {
      messages[msgIndex] = { ...messages[msgIndex], streaming: false };
      messages = [...messages];
      asking = false;
      scrollToBottom();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  function clearChat() {
    messages = [];
  }
</script>

<svelte:head>
  <title>Ask - Kyro</title>
</svelte:head>

<div class="ask-page">
  <header class="page-header">
    <div class="header-content">
      <span class="prompt">$</span>
      <span class="command">./ask.sh</span>
    </div>
    {#if messages.length > 0}
      <Button variant="ghost" size="sm" onclick={clearChat}>clear</Button>
    {/if}
  </header>

  {#if !data.hasApiKey}
    <Card>
      <div class="empty-state">
        <span class="empty-icon">🔑</span>
        <h3>API Key Required</h3>
        <p>You need an API key with read scope to ask questions over your files.</p>
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
        </div>
      </Card>

      <div class="chat-area">
        {#if messages.length === 0}
          <div class="chat-empty">
            <span class="chat-empty-prompt">$</span>
            <span class="chat-empty-text">
              Ask anything about your {scope === "org" ? "organisation's files" : "collection"}.
            </span>
          </div>
        {/if}

        {#each messages as msg}
          <div class="message message-{msg.role}">
            {#if msg.role === "user"}
              <div class="message-bubble message-bubble-user">
                <span class="message-marker">›</span>
                {msg.content}
              </div>
            {:else}
              <div class="message-bubble message-bubble-assistant">
                {#if msg.content}
                  <p class="message-text">{msg.content}{#if msg.streaming}<span class="cursor-blink"></span>{/if}</p>
                {:else if msg.streaming}
                  <p class="message-text thinking">thinking<span class="dots"><span>.</span><span>.</span><span>.</span></span></p>
                {/if}

                {#if msg.error}
                  <p class="message-error">// {msg.error}</p>
                {/if}

                {#if msg.sources && msg.sources.length > 0}
                  <details class="sources-block">
                    <summary>{msg.sources.length} source{msg.sources.length === 1 ? "" : "s"}</summary>
                    <div class="sources-list">
                      {#each msg.sources as source, si}
                        <div class="source-item">
                          <div class="source-header">
                            <span class="source-index">[{si + 1}]</span>
                            <span class="source-name">{source.fileName}</span>
                            <Badge size="sm">chunk {source.chunkIndex}</Badge>
                          </div>
                          <p class="source-content">{source.content}</p>
                        </div>
                      {/each}
                    </div>
                  </details>
                {/if}
              </div>
            {/if}
          </div>
        {/each}

        <div bind:this={scrollAnchor}></div>
      </div>

      <div class="composer">
        <textarea
          class="composer-input"
          bind:value={question}
          onkeydown={handleKeydown}
          placeholder="Ask a question about your files…"
          rows="2"
          disabled={asking}
        ></textarea>
        <button
          class="composer-send"
          onclick={handleAsk}
          disabled={asking || !question.trim()}
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .ask-page {
    max-width: 760px;
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--space-5) * 2 - 42px);
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
    flex-shrink: 0;
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

  .scope-loading,
  .scope-empty {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .scope-empty a {
    color: var(--color-text-dim);
    text-decoration: underline;
  }

  .chat-area {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4) 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-height: 200px;
  }

  .chat-empty {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-6) var(--space-2);
    color: var(--color-text-muted);
  }

  .chat-empty-prompt {
    font-family: var(--font-mono);
    color: var(--color-success);
    font-weight: 700;
  }

  .chat-empty-text {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .message {
    display: flex;
  }

  .message-user {
    justify-content: flex-end;
  }

  .message-assistant {
    justify-content: flex-start;
  }

  .message-bubble {
    max-width: 100%;
    border-radius: var(--radius-lg);
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-sm);
    line-height: 1.6;
  }

  .message-bubble-user {
    background: var(--color-bg-3);
    border: 1px solid var(--color-border-2);
    color: var(--color-text);
    font-family: var(--font-mono);
  }

  .message-marker {
    color: var(--color-success);
    margin-right: var(--space-2);
    font-weight: 700;
  }

  .message-bubble-assistant {
    background: var(--color-bg-2);
    border: 1px solid var(--color-border);
    color: var(--color-text-dim);
    width: 100%;
  }

  .message-text {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .message-text.thinking {
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    text-transform: lowercase;
  }

  .cursor-blink {
    display: inline-block;
    width: 6px;
    height: 13px;
    background: var(--color-text-dim);
    margin-left: 2px;
    vertical-align: middle;
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  .dots span {
    animation: blink 1.2s step-end infinite;
  }
  .dots span:nth-child(2) { animation-delay: 0.2s; }
  .dots span:nth-child(3) { animation-delay: 0.4s; }

  .message-error {
    color: var(--color-danger);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    margin: var(--space-2) 0 0;
  }

  .sources-block {
    margin-top: var(--space-3);
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-2);
  }

  .sources-block summary {
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    user-select: none;
  }

  .sources-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .source-item {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
  }

  .source-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
  }

  .source-index {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    font-weight: 600;
  }

  .source-name {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text);
    flex: 1;
    word-break: break-all;
  }

  .source-content {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin: 0;
    line-height: 1.5;
    max-height: 80px;
    overflow-y: auto;
  }

  .composer {
    display: flex;
    gap: var(--space-2);
    align-items: flex-end;
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .composer-input {
    flex: 1;
    resize: none;
    padding: var(--space-3);
    background: var(--color-bg-2);
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    outline: none;
    transition: border-color 0.1s ease;
  }

  .composer-input:focus {
    border-color: var(--color-border-active);
  }

  .composer-input:disabled {
    opacity: 0.5;
  }

  .composer-send {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    background: var(--color-text);
    color: var(--color-bg);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    flex-shrink: 0;
    transition: opacity 0.1s ease;
  }

  .composer-send:hover:not(:disabled) {
    opacity: 0.85;
  }

  .composer-send:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .ask-page {
      max-width: 100%;
      height: calc(100vh - var(--space-3) * 2 - 42px - 60px);
    }

    .message-bubble {
      max-width: 100%;
    }
  }
</style>
