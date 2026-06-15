<script lang="ts">
  import { page } from "$app/stores";
  import Button from "$lib/components/ui/Button.svelte";

  const status = $derived($page.status);
  const error = $derived($page.error);
</script>

<div class="error-page">
  <div class="error-content">
    <h1 class="error-code">{status}</h1>
    <p class="error-message">{error?.message ?? "An error occurred"}</p>
    <p class="error-description">
      {#if status === 404}
        The page you're looking for doesn't exist.
      {:else if status === 403}
        You don't have permission to access this resource.
      {:else if status === 500}
        Something went wrong on our end. Please try again later.
      {:else}
        An unexpected error occurred.
      {/if}
    </p>
    <div class="error-actions">
      <Button onclick={() => window.history.back()}>Go Back</Button>
      <Button variant="secondary" onclick={() => (window.location.href = "/")}
        >Go Home</Button
      >
    </div>
  </div>
</div>

<style>
  .error-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
  }

  .error-content {
    text-align: center;
    max-width: 400px;
  }

  .error-code {
    font-size: 120px;
    font-weight: 700;
    line-height: 1;
    color: var(--color-accent);
    opacity: 0.3;
  }

  .error-message {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--color-text);
    margin-top: var(--space-4);
  }

  .error-description {
    font-size: var(--font-size-base);
    color: var(--color-text-muted);
    margin-top: var(--space-2);
  }

  .error-actions {
    display: flex;
    gap: var(--space-3);
    justify-content: center;
    margin-top: var(--space-6);
  }
</style>
