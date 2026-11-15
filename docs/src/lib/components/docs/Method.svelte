<script lang="ts">
  let { method }: { method: string } = $props();
</script>

<span class="method {method.toLowerCase()}">{method}</span>

<style>
  .method {
    display: inline-block;
    min-width: 4.2em;
    padding: 1px 6px;
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-sm);
    color: var(--color-text-dim);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.03em;
    line-height: 1.6;
    text-align: center;
  }
  .get {
    background: var(--color-bg-4);
    color: var(--color-text);
  }
  .post {
    background: var(--color-text);
    border-color: var(--color-text);
    color: var(--color-bg);
  }
  .put,
  .patch {
    border-color: var(--color-border-hover);
    color: var(--color-text);
  }
  .delete {
    border-style: dashed;
    border-color: var(--color-border-hover);
  }
</style>
