<script lang="ts">
  import { fade, scale } from "svelte/transition";

  interface Props {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning";
    onconfirm: () => void;
    oncancel: () => void;
  }

  let {
    open = $bindable(),
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "danger",
    onconfirm,
    oncancel,
  }: Props = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") oncancel();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    class="dialog-backdrop"
    transition:fade={{ duration: 80 }}
    onclick={oncancel}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div
      class="dialog"
      transition:scale={{ duration: 80, start: 0.97 }}
      onclick={(e) => e.stopPropagation()}
    >
      <div class="dialog-line variant-{variant}"></div>
      <div class="dialog-inner">
        <h3 class="dialog-title">// {title}</h3>
        <p class="dialog-message">{message}</p>
        <div class="actions">
          <button class="btn-cancel" onclick={oncancel}>{cancelLabel}</button>
          <button class="btn-confirm btn-{variant}" onclick={onconfirm}
            >{confirmLabel}</button
          >
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1001;
    padding: var(--space-4);
    backdrop-filter: blur(2px);
  }

  .dialog {
    background: var(--color-bg-2);
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 380px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  }

  .dialog-line {
    height: 2px;
  }

  .variant-danger {
    background: var(--color-danger);
  }
  .variant-warning {
    background: var(--color-warning);
  }

  .dialog-inner {
    padding: var(--space-5);
  }

  .dialog-title {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 var(--space-3);
    letter-spacing: 0.3px;
  }

  .dialog-message {
    color: var(--color-text-dim);
    font-size: var(--font-size-sm);
    margin: 0 0 var(--space-5);
    line-height: 1.6;
  }

  .actions {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
  }

  button {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.1s ease;
    letter-spacing: 0.3px;
  }

  .btn-cancel {
    background: transparent;
    border: 1px solid var(--color-border-2);
    color: var(--color-text-dim);
  }

  .btn-cancel:hover {
    border-color: var(--color-border-hover);
    color: var(--color-text);
  }

  .btn-confirm {
    border: none;
  }

  .btn-danger {
    background: var(--color-danger);
    color: #fff;
  }

  .btn-danger:hover {
    opacity: 0.85;
  }

  .btn-warning {
    background: var(--color-warning);
    color: #000;
  }

  .btn-warning:hover {
    opacity: 0.85;
  }
  @media (max-width: 640px) {
    .dialog {
      max-width: 100%;
      margin: 0 var(--space-3);
    }

    .actions {
      flex-direction: column-reverse;
    }

    .actions button {
      width: 100%;
    }
  }
</style>
