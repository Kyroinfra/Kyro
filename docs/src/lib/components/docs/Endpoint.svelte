<script lang="ts">
  import {
    authType,
    curl,
    fetchSnippet,
    formatExample,
    paramRows,
    parseBody,
    successCode,
    type Endpoint as Ep,
    type Row,
  } from "$lib/docs/api";
  import CodeBlock from "./CodeBlock.svelte";
  import Inline from "./Inline.svelte";
  import Method from "./Method.svelte";

  let { ep }: { ep: Ep } = $props();

  const tabs = ["curl", "fetch"] as const;
  let tab = $state<(typeof tabs)[number]>("curl");

  const authLabels = {
    bearer: "Bearer JWT",
    apiKey: "X-Api-Key or Bearer JWT",
    none: "No auth",
  };

  const auth = $derived(authLabels[authType(ep.op)]);
  const scope = $derived(ep.op["x-scope"]);
  const body = $derived(parseBody(ep.op));
  const pathRows = $derived(paramRows(ep.op, "path"));
  const queryRows = $derived(paramRows(ep.op, "query"));
  const responses = $derived(Object.entries(ep.op.responses ?? {}));
  const example = $derived(formatExample(ep.op["x-response-example"]));
  const ok = $derived(successCode(ep.op));
  const request = $derived(tab === "curl" ? curl(ep) : fetchSnippet(ep));
</script>

{#snippet table(title: string, rows: Row[])}
  <div class="block">
    <h4>{title}</h4>
    <div class="scroll">
      <table>
        <thead>
          <tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          {#each rows as r}
            <tr>
              <td><code>{r.name}</code></td>
              <td>{r.type}</td>
              <td>{r.required ? "yes" : "no"}</td>
              <td>
                <Inline text={r.description} />
                {#if r.extra}<div class="extra">{r.extra}</div>{/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/snippet}

<section id={ep.id} class="endpoint" data-spy>
  <header>
    <h3>
      <Method method={ep.method} />
      <code class="path">{ep.path}</code>
    </h3>
    <p class="summary">{ep.op.summary ?? ""}</p>
    <p class="meta">
      {auth}{#if scope}{" · "}scope: {scope}{/if}
    </p>
    {#if ep.op.description}
      <p class="desc"><Inline text={ep.op.description} /></p>
    {/if}
  </header>

  <div class="body">
    <div class="left">
      {#if pathRows.length}{@render table("Path parameters", pathRows)}{/if}
      {#if queryRows.length}{@render table("Query parameters", queryRows)}{/if}

      {#if body}
        {#if body.rows.length}
          {@render table(`Request body (${body.contentType})`, body.rows)}
        {:else if body.free}
          <div class="block">
            <h4>Request body ({body.contentType})</h4>
            <p class="desc">A flat object of string values.</p>
          </div>
        {/if}
      {/if}

      <div class="block">
        <h4>Responses</h4>
        <ul class="responses">
          {#each responses as [code, res]}
            <li>
              <span class="status s{code[0]}">{code}</span>
              <span><Inline text={res.description ?? ""} /></span>
            </li>
          {/each}
        </ul>
      </div>
    </div>

    <div class="right">
      <CodeBlock code={request}>
        {#snippet bar()}
          <div class="tabs" role="tablist" aria-label="Request language">
            {#each tabs as t}
              <button
                type="button"
                role="tab"
                aria-selected={tab === t}
                class:active={tab === t}
                onclick={() => (tab = t)}>{t}</button
              >
            {/each}
          </div>
        {/snippet}
      </CodeBlock>

      {#if example}
        <CodeBlock code={example} lang={ok ? `response ${ok}` : "response"} />
      {/if}
    </div>
  </div>
</section>

<style>
  .endpoint {
    padding: var(--space-8) var(--space-10);
    border-top: 1px solid var(--color-border);
    scroll-margin-top: calc(var(--topbar, 50px) + 16px);
  }

  header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-6);
  }
  h3 {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--font-size-lg);
  }
  .path {
    padding: 0;
    border: 0;
    background: none;
    color: var(--color-text);
    word-break: break-all;
  }
  .summary {
    color: var(--color-text);
  }
  .meta,
  .extra {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }
  .desc {
    max-width: 68ch;
    color: var(--color-text-dim);
  }

  .body {
    display: grid;
    gap: var(--space-8);
  }
  .left,
  .right {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    min-width: 0;
  }

  h4 {
    margin-bottom: var(--space-2);
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    font-weight: 500;
  }

  .scroll {
    overflow-x: auto;
  }
  table {
    width: 100%;
    min-width: 420px;
    border-collapse: collapse;
    font-size: 12px;
  }
  th,
  td {
    padding: 8px var(--space-3) 8px 0;
    border-bottom: 1px solid var(--color-border);
    text-align: left;
    vertical-align: top;
  }
  th {
    color: var(--color-text-muted);
    font-weight: 500;
  }
  td {
    color: var(--color-text-dim);
  }
  td:first-child,
  td:nth-child(2) {
    white-space: nowrap;
  }
  td code {
    padding: 0;
    border: 0;
    background: none;
    color: var(--color-text);
  }

  .responses {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    list-style: none;
  }
  .responses li {
    display: flex;
    gap: var(--space-3);
    color: var(--color-text-dim);
  }
  .status {
    flex: none;
    min-width: 3em;
    padding: 0 6px;
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-sm);
    font-size: 11px;
    line-height: 1.7;
    text-align: center;
  }
  .s2 {
    color: var(--color-text);
  }
  .s5 {
    background: var(--color-text);
    border-color: var(--color-text);
    color: var(--color-bg);
  }

  .tabs {
    display: flex;
    gap: var(--space-1);
  }
  .tabs button {
    padding: 2px 8px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }
  .tabs button:hover {
    color: var(--color-text);
  }
  .tabs button.active {
    background: var(--color-bg-4);
    color: var(--color-text);
  }
  .tabs button:focus-visible {
    outline: 1px solid var(--color-text);
    outline-offset: 1px;
  }

  @media (min-width: 1101px) {
    .body {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: start;
    }
    .right {
      position: sticky;
      top: calc(var(--topbar, 50px) + 16px);
      max-height: calc(100vh - var(--topbar, 50px) - 32px);
      overflow-y: auto;
    }
  }

  @media (max-width: 640px) {
    .endpoint {
      padding: var(--space-6) var(--space-4);
    }
  }
</style>
