<script lang="ts">
  import Logo from "$lib/components/Logo.svelte";
  import GithubIcon from "$lib/components/icons/GithubIcon.svelte";

  const GITHUB = "https://github.com/Kyroinfra/Kyro";
  const NPM = "https://www.npmjs.com/package/@kyroinfra/kyro";
</script>

<svelte:head>
  <title>Kyro — RAG without the data leak</title>
  <meta
    name="description"
    content="Upload documents, ask questions in plain English. Everything runs on your own server."
  />
</svelte:head>

<div class="landing">
  <header class="header">
    <a href="/" class="logo" aria-label="Kyro home">
      <Logo size={22} />
      <span>kyro</span>
    </a>
    <nav aria-label="Primary">
      <a href="/docs">docs</a>
      <a href={GITHUB} target="_blank" rel="noopener noreferrer">
        <GithubIcon size={15} />
      </a>
    </nav>
  </header>

  <main>
    <section class="hero">
      <h1>Self-hosted RAG platform</h1>

      <p>
        Add document Q&A to your product with the
        <a href={NPM} class="squiggle" target="_blank" rel="noopener noreferrer"
          >Kyro SDK</a
        >. Your data stays on your server.
      </p>

      <div class="actions">
        <a href="/docs" class="btn btn-solid">
          <span class="label">Read docs</span>
          <svg
            class="bird"
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              pathLength="1"
              d="M2 14 C5 6, 9 6, 12 13 C15 6, 19 6, 22 14"
            />
          </svg>
        </a>

        <a
          href={GITHUB}
          class="btn btn-star"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            class="star"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
          <span>Star on GitHub</span>
        </a>
      </div>
    </section>
  </main>
</div>

<style>
  .landing {
    --color-bg: #000;
    --color-bg-2: #000;
    --color-bg-3: #0a0a0a;
    --color-text: #fff;
    --color-text-dim: #b3b3b3;
    --color-text-muted: #808080;
    --color-border: #262626;
    --color-border-2: #404040;

    --max: 880px;
    --gutter: var(--space-6);

    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--color-bg);
    color: var(--color-text);
  }

  .header,
  .hero {
    width: 100%;
    max-width: var(--max);
    margin-inline: auto;
    padding-inline: var(--gutter);
  }

  main {
    flex: 1;
  }

  a {
    color: var(--color-text-dim);
  }
  a:hover {
    color: var(--color-text);
  }
  a:focus-visible {
    outline: 1px solid var(--color-text);
    outline-offset: 3px;
  }

  nav {
    display: flex;
    gap: var(--space-6);
    font-size: var(--font-size-sm);
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-block: var(--space-5);
  }
  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text);
    font-weight: 700;
  }

  .hero {
    padding-block: 120px 96px;
  }
  h1 {
    font-size: clamp(36px, 7vw, 64px);
    line-height: 1.05;
    letter-spacing: -0.03em;
    max-width: 14ch;
  }
  .hero p {
    margin-top: var(--space-6);
    max-width: 48ch;
    font-size: var(--font-size-lg);
    line-height: 1.6;
    color: var(--color-text-dim);
  }
  .hero p a {
    font-size: 1.3rem;
    font-style: italic;
  }

  .squiggle {
    color: var(--color-text);
    text-decoration: underline wavy var(--color-text-muted);
    text-decoration-thickness: 1px;
    text-underline-offset: 5px;
    transition: text-decoration-color 0.15s ease;
  }
  .squiggle:hover {
    text-decoration-color: var(--color-text);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-top: var(--space-8);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    height: 44px;
    padding-inline: var(--space-5);
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    color: var(--color-text);
  }
  .btn:hover {
    border-color: var(--color-text);
  }

  .btn-solid {
    display: inline-grid;
    place-items: center;
    background: var(--color-text);
    border-color: var(--color-text);
    color: var(--color-bg);
    font-weight: 600;
  }
  .btn-solid:hover {
    color: var(--color-bg);
    background: var(--color-text-dim);
    border-color: var(--color-text-dim);
  }
  .btn-solid > * {
    grid-area: 1 / 1;
  }

  .label {
    transition:
      opacity 0.2s ease,
      transform 0.2s ease;
  }

  .bird path {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    transition: stroke-dashoffset 0.5s ease 0.1s;
  }

  .btn-solid:hover .label,
  .btn-solid:focus-visible .label {
    opacity: 0;
    transform: translateY(-6px);
  }
  .btn-solid:hover .bird path,
  .btn-solid:focus-visible .bird path {
    stroke-dashoffset: 0;
  }

  .btn-star {
    gap: var(--space-2);
    border: none;
    text-decoration-line: underline;
    text-decoration-color: #ff69b4;
    text-decoration-thickness: 2px;
    text-underline-offset: 0.5rem;
  }

  .star {
    color: var(--color-text-muted);
    transition:
      color 0.2s ease,
      transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .btn-star:hover .star,
  .btn-star:focus-visible .star {
    color: #facc15;
    transform: rotate(72deg) scale(1.25);
  }

  @media (prefers-reduced-motion: reduce) {
    .label,
    .bird path {
      transition: none;
    }
    .star {
      transition: color 0.2s ease;
    }
    .btn-star:hover .star,
    .btn-star:focus-visible .star {
      transform: none;
    }
  }

  @media (max-width: 640px) {
    .landing {
      --gutter: var(--space-4);
    }
    .hero {
      padding-block: 72px 56px;
    }
    .btn {
      flex: 1 1 100%;
      justify-content: center;
    }
  }
</style>
