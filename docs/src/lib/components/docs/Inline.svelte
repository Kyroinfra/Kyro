<script lang="ts">
  let { text }: { text: string } = $props();
</script>

{#each text.split("`") as part, i}{#if i % 2}<code>{part}</code>{:else}{part}{/if}{/each}

<style>
  code {
    padding: 0 4px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg-3);
    color: var(--color-text);
    font-size: 0.92em;
  }
</style>
