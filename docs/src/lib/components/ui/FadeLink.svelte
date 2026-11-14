<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAnchorAttributes } from "svelte/elements";

  interface Props extends HTMLAnchorAttributes {
    external?: boolean;
    children: Snippet;
  }

  let {
    external = false,
    children,
    class: className = "",
    ...rest
  }: Props = $props();
</script>

<a
  class="fade-link {className}"
  {...rest}
  target={external ? "_blank" : undefined}
  rel={external ? "noopener noreferrer" : undefined}
>
  {@render children()}
</a>

<style>
  .fade-link {
    --underline-top: #fff;
    --underline-bottom: #8a8a8a;
    --underline-size: 3px;
    --underline-lift: 6px; /* how far it moves toward the text */

    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding-bottom: 5px;
    color: var(--color-text);
    background-image: linear-gradient(
      to bottom,
      var(--underline-top),
      var(--underline-bottom)
    );
    background-repeat: no-repeat;
    background-position: 0 100%;
    background-size: 100% var(--underline-size);

    padding-bottom: 8px;
    background-size: 100% var(--underline-size);
    background-position: 0 100%;
  }

  .fade-link:focus-visible {
    outline: 1px solid var(--color-text);
    outline-offset: 4px;
    background-position: 0 calc(100% - var(--underline-lift));
  }
</style>
