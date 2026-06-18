<script lang="ts">
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>KYRO</title>
</svelte:head>

<div class="landing">
  <div class="hero">
    <h1 class="logo">KYRO</h1>
    <p class="tagline">welcome</p>
    <a href="/register" class="btn-primary">Get Started</a>
  </div>
</div>

<style>
  .landing {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    padding: var(--space-8);
  }

  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
    text-align: center;
  }

  .logo {
    font-family: var(--font-mono);
    font-size: clamp(3rempx, 10vw, 96px);
    font-weight: 700;
    letter-spacing: 0.15em;
    color: var(--color-text);
    text-transform: uppercase;
  }

  .tagline {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text-dim);
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: lowercase;
    margin-top: calc(var(--space-2) * -1);
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 48px;
    padding: 0 26px;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-bg);
    background: var(--color-text);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    text-decoration: none;
    transition: opacity 0.15s ease, transform 0.15s ease;
  }

  .btn-primary:hover {
    opacity: 0.88;
    transform: translateY(-1px);
    color: var(--color-bg);
  }

  .btn-primary:active {
    transform: translateY(0);
    opacity: 0.8;
  }
</style>
