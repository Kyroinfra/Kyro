<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    code: string;
    lang?: string;
    bar?: Snippet;
  }

  let { code, lang = "", bar }: Props = $props();

  let copied = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
      clearTimeout(timer);
      timer = setTimeout(() => (copied = false), 1800);
    } catch {
      copied = false;
    }
  }
</script>

<div class="code">
  <div class="bar">
    {#if bar}{@render bar()}{:else}<span class="lang">{lang}</span>{/if}
    <button type="button" class="copy" onclick={copy}>
      {copied ? "copied" : "copy"}
    </button>
  </div>
  <pre><code>{code}</code></pre>
</div>

<style>
  .code {
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-bg-2);
  }
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: 6px var(--space-3);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-3);
  }
  .lang {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }
  .copy {
    padding: 2px 8px;
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-dim);
    font-size: var(--font-size-xs);
  }
  .copy:hover {
    border-color: var(--color-border-hover);
    color: var(--color-text);
  }
  .copy:focus-visible {
    outline: 1px solid var(--color-text);
    outline-offset: 2px;
  }
  pre {
    overflow-x: auto;
    padding: var(--space-4);
    color: var(--color-text-dim);
    font-size: 12px;
    line-height: 1.7;
  }
  code {
    padding: 0;
    border: 0;
    background: none;
  }
</style>
