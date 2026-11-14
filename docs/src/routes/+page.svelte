<script lang="ts">
  import Logo from "$lib/components/Logo.svelte";
  import GithubIcon from "$lib/components/icons/GithubIcon.svelte";

  const GITHUB = "https://github.com/Kyroinfra/Kyro";
  // NOTE: Remember to change this to kyro-sdk-typescript npm link
  const NPM = "https://github.com/Kyroinfra/kyro-sdk-typescript";

  const features = [
    {
      title: "Ask your documents",
      desc: "Get answers with citations. The model only sees what's in your files.",
    },
    {
      title: "Hybrid search",
      desc: "Keyword search and vector similarity, merged with RRF.",
    },
    {
      title: "Self-hosted",
      desc: "Postgres, Ollama and Kyro on your own server. Nothing leaves your network.",
    },
    {
      title: "API-first",
      desc: "Scoped API keys, roles, webhooks and collections.",
    },
  ];

  const steps = [
    { title: "Deploy", cmd: "docker compose up -d" },
    { title: "Upload documents", cmd: "POST /api/v1/files" },
    { title: "Ask questions", cmd: "POST /api/v1/ask" },
  ];

  // Kept as a string so you don't need {"{"} escapes inside the markup.
  const code = `const res = await fetch("/api/v1/ask", {
  method: "POST",
  headers: { "X-API-Key": process.env.KYRO_KEY },
  body: JSON.stringify({
    question: "What are the payment terms?",
    topK: 8,
  }),
});`;
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
          <span class="label">Read the docs</span>
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
        <a href={GITHUB} class="btn" target="_blank" rel="noopener noreferrer">
          View on GitHub
        </a>
      </div>
    </section>

    <section class="block" aria-labelledby="code-h">
      <h2 id="code-h">One endpoint</h2>
      <pre><code>{code}</code></pre>
    </section>

    <section class="block" aria-labelledby="features-h">
      <h2 id="features-h">Features</h2>
      <div class="grid">
        {#each features as f}
          <div class="item">
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        {/each}
      </div>
    </section>

    <section class="block" aria-labelledby="steps-h">
      <h2 id="steps-h">Get started</h2>
      <ol class="steps">
        {#each steps as s}
          <li>
            <span>{s.title}</span>
            <code>{s.cmd}</code>
          </li>
        {/each}
      </ol>
    </section>
  </main>

  <footer class="footer">
    <span>© 2026 kyro</span>
    <nav aria-label="Footer">
      <a href="/docs">docs</a>
      <a href={GITHUB} target="_blank" rel="noopener noreferrer">github</a>
    </nav>
  </footer>
</div>

<style>
  /* Black and white theme, scoped to this page only.
     Overriding the tokens here means the docs page (which reads the
     same tokens from the global stylesheet) is not affected. */
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

  /* Shared layout: header, main sections and footer line up */
  .header,
  .footer,
  .hero,
  .block {
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

  /* Header */
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

  /* Hero */
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

  /* Content sections */
  .block {
    padding-block: var(--space-12);
    border-top: 1px solid var(--color-border);
  }
  h2 {
    font-size: var(--font-size-xl);
    letter-spacing: -0.01em;
    margin-bottom: var(--space-6);
  }
  h3 {
    font-size: var(--font-size-base);
    margin-bottom: var(--space-2);
  }
  .item p {
    font-size: var(--font-size-sm);
    line-height: 1.7;
    color: var(--color-text-dim);
  }

  pre {
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-bg-3);
    overflow-x: auto;
    font-size: var(--font-size-sm);
    line-height: 1.7;
    color: var(--color-text-dim);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-8) var(--space-10);
  }

  .steps {
    list-style: none;
  }
  .steps li {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-2) var(--space-6);
    padding-block: var(--space-4);
    border-bottom: 1px solid var(--color-border);
    font-size: var(--font-size-sm);
  }
  .steps code {
    color: var(--color-text-dim);
  }

  /* Footer */
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-block: var(--space-6);
    border-top: 1px solid var(--color-border);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
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

  .btn-solid {
    display: inline-grid;
    place-items: center;
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
    stroke-dashoffset: 1; /* undrawn */
    transition: stroke-dashoffset 0.5s ease 0.1s;
  }

  .btn-solid:hover .label,
  .btn-solid:focus-visible .label {
    opacity: 0;
    transform: translateY(-6px);
  }
  .btn-solid:hover .bird path,
  .btn-solid:focus-visible .bird path {
    stroke-dashoffset: 0; /* draws in */
  }

  @media (prefers-reduced-motion: reduce) {
    .label,
    .bird path {
      transition: none;
    }
  }

  @media (max-width: 640px) {
    .landing {
      --gutter: var(--space-4);
    }
    .hero {
      padding-block: 72px 56px;
    }
    .grid {
      grid-template-columns: 1fr;
    }
    .btn {
      flex: 1 1 100%;
      justify-content: center;
    }
  }
</style>
