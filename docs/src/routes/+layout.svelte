<script lang="ts">
  import "@fontsource/iosevka/400.css";
  import "@fontsource/iosevka/500.css";
  import "@fontsource/iosevka/600.css";
  import "@fontsource/iosevka/700.css";
  import "../app.css";
  import type { Snippet } from "svelte";

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();
</script>

<main>
  {@render children()}
</main>

<style>
  main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>
