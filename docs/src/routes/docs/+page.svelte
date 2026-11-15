<script lang="ts">
  import { onMount } from "svelte";
  import Logo from "$lib/components/Logo.svelte";
  import GithubIcon from "$lib/components/icons/GithubIcon.svelte";
  import CodeBlock from "$lib/components/docs/CodeBlock.svelte";
  import Endpoint from "$lib/components/docs/Endpoint.svelte";
  import Inline from "$lib/components/docs/Inline.svelte";
  import Method from "$lib/components/docs/Method.svelte";
  import { groups, spec } from "$lib/docs/api";
  import { sections } from "$lib/docs/content";

  const GITHUB = "https://github.com/Kyroinfra/Kyro";
  const SPEC_URL =
    "https://github.com/Kyroinfra/Kyro/blob/main/packages/api/openapi.yaml";

  const nav = [
    { id: "overview", label: "Overview", sub: false },
    ...sections.map((s) => ({ id: s.id, label: s.label, sub: !!s.sub })),
  ];

  let open = $state(false);
  let active = $state("overview");

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") open = false;
  }

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          active = entry.target.id;
          document
            .querySelector(`.sidebar a[href="#${entry.target.id}"]`)
            ?.scrollIntoView({ block: "nearest" });
          break;
        }
      },
      { rootMargin: "-80px 0px -55% 0px" },
    );
    document.querySelectorAll("[data-spy]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });
</script>

<svelte:head>
  <title>API Reference — Kyro</title>
</svelte:head>

<svelte:window onkeydown={onKey} />

<div class="docs">
  <header class="topbar">
    <div class="left">
      <button
        type="button"
        class="menu"
        aria-label="Toggle navigation"
        aria-expanded={open}
        aria-controls="docs-nav"
        onclick={() => (open = !open)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>
      <a href="/" class="logo" aria-label="Kyro home">
        <Logo size={20} />
        <span>kyro</span>
      </a>
      <span class="crumb">/ API Reference</span>
    </div>
    <a href={GITHUB} target="_blank" rel="noopener noreferrer" aria-label="Kyro on GitHub">
      <GithubIcon size={15} />
    </a>
  </header>

  <div class="layout">
    {#if open}
      <button type="button" class="overlay" aria-label="Close navigation" onclick={() => (open = false)}></button>
    {/if}

    <aside id="docs-nav" class="sidebar" class:open aria-label="Documentation">
      <div class="group">
        <p class="group-title">General</p>
        {#each nav as item}
          <a
            href="#{item.id}"
            class:sub={item.sub}
            class:active={active === item.id}
            onclick={() => (open = false)}>{item.label}</a
          >
        {/each}
      </div>

      {#each groups as g}
        <div class="group">
          <p class="group-title">{g.label}</p>
          {#each g.endpoints as ep}
            <a
              href="#{ep.id}"
              class="ep"
              class:active={active === ep.id}
              onclick={() => (open = false)}
            >
              <Method method={ep.method} />
              <span class="ep-path">{ep.path}</span>
            </a>
          {/each}
        </div>
      {/each}
    </aside>

    <div class="content">
      <section id="overview" class="section" data-spy>
        <div class="head">
          <h1>{spec.info.title}</h1>
          <p class="version">v{spec.info.version} · OpenAPI {spec.openapi}</p>
        </div>
        <p class="prose">{spec.info.description}</p>
        <dl class="facts">
          <div><dt>Default URL</dt><dd>http://localhost:3000/api/v1</dd></div>
          <div><dt>License</dt><dd>ISC (api) · MIT (SDK)</dd></div>
          <div><dt>Auth</dt><dd>X-Api-Key · Bearer JWT</dd></div>
        </dl>
        <p>
          <a class="link" href={SPEC_URL} target="_blank" rel="noopener noreferrer">
            OpenAPI spec (YAML)
          </a>
        </p>
      </section>

      {#each sections as s (s.id)}
        <section id={s.id} class="section" data-spy>
          <h2>{s.title}</h2>
          {#each s.blocks as b}
            {#if b.t === "p"}
              <p class="prose"><Inline text={b.text} /></p>
            {:else if b.t === "h"}
              <h3>{b.text}</h3>
            {:else if b.t === "note"}
              <div class="note"><Inline text={b.text} /></div>
            {:else if b.t === "code"}
              <CodeBlock code={b.text} lang={b.lang} />
            {:else if b.t === "facts"}
              <dl class="facts">
                {#each b.items as [label, value]}
                  <div><dt>{label}</dt><dd>{value}</dd></div>
                {/each}
              </dl>
            {:else if b.t === "table"}
              <div class="scroll">
                <table>
                  <thead>
                    <tr>{#each b.head as h}<th>{h}</th>{/each}</tr>
                  </thead>
                  <tbody>
                    {#each b.rows as r}
                      <tr>{#each r as cell}<td><Inline text={cell} /></td>{/each}</tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {:else if b.t === "cards"}
              <div class="cards">
                {#each b.items as c}
                  <a href={c.href} class="card">
                    <span class="tag">{c.tag}</span>
                    <h3>{c.title}</h3>
                    <p><Inline text={c.text} /></p>
                    <span class="more">{c.link}</span>
                  </a>
                {/each}
              </div>
            {:else if b.t === "steps"}
              <ol class="steps">
                {#each b.items as item}
                  <li>
                    <h3>{item.title}</h3>
                    <p class="prose"><Inline text={item.text} /></p>
                    {#if item.code}
                      <CodeBlock code={item.code.text} lang={item.code.lang} />
                    {/if}
                  </li>
                {/each}
              </ol>
            {:else if b.t === "methods"}
              <div class="methods">
                {#each b.items as m}
                  <article>
                    <code class="sig">{m.sig}</code>
                    <p class="prose"><Inline text={m.desc} /></p>
                    <CodeBlock code={m.code} lang="typescript" />
                  </article>
                {/each}
              </div>
            {/if}
          {/each}
        </section>
      {/each}

      {#each groups as g (g.id)}
        <section id="api-{g.id}" class="section group-head" data-spy>
          <h2>{g.label}</h2>
          <p class="prose">{g.description}</p>
        </section>
        {#each g.endpoints as ep (ep.id)}
          <Endpoint {ep} />
        {/each}
      {/each}
    </div>
  </div>
</div>

<style>
  .docs {
    --topbar: 50px;
    min-height: 100vh;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    line-height: 1.7;
  }

  a {
    color: var(--color-text-dim);
  }
  a:hover {
    color: var(--color-text);
  }
  a:focus-visible,
  button:focus-visible {
    outline: 1px solid var(--color-text);
    outline-offset: 3px;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--topbar);
    padding-inline: var(--space-6);
    border-bottom: 1px solid var(--color-border);
    background: rgba(0, 0, 0, 0.9);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
  }
  .left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }
  .menu {
    display: flex;
    padding: 4px;
    border: 0;
    background: none;
    color: var(--color-text-dim);
  }
  .menu:hover {
    color: var(--color-text);
  }
  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text);
    font-weight: 700;
  }
  .crumb {
    overflow: hidden;
    color: var(--color-text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .layout {
    display: flex;
    max-width: 1440px;
    margin-inline: auto;
  }

  .overlay {
    position: fixed;
    inset: var(--topbar) 0 0 0;
    z-index: 40;
    border: 0;
    background: rgba(0, 0, 0, 0.7);
  }

  .sidebar {
    position: fixed;
    top: var(--topbar);
    bottom: 0;
    left: 0;
    z-index: 45;
    width: 260px;
    max-width: 85vw;
    overflow-y: auto;
    padding-block: var(--space-4) var(--space-12);
    border-right: 1px solid var(--color-border);
    background: var(--color-bg);
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    scrollbar-width: none;
  }
  .sidebar::-webkit-scrollbar {
    display: none;
  }
  .sidebar.open {
    transform: none;
  }

  .group {
    display: flex;
    flex-direction: column;
    padding: 0 var(--space-3);
    margin-bottom: var(--space-4);
  }
  .group-title {
    padding: var(--space-2) var(--space-2) var(--space-1);
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }
  .group a {
    padding: 4px var(--space-2);
    border-left: 1px solid transparent;
    color: var(--color-text-dim);
    font-size: 12px;
  }
  .group a:hover {
    color: var(--color-text);
  }
  .group a.active {
    border-left-color: var(--color-text);
    color: var(--color-text);
  }
  .group a.sub {
    padding-left: var(--space-5);
  }
  .group a.ep {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    overflow: hidden;
  }
  .ep-path {
    overflow: hidden;
    font-size: var(--font-size-xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .content {
    flex: 1;
    min-width: 0;
    padding-bottom: 80px;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    padding: var(--space-12) var(--space-10);
    border-top: 1px solid var(--color-border);
    scroll-margin-top: calc(var(--topbar) + 16px);
  }
  .section:first-child {
    border-top: 0;
  }
  .group-head {
    padding-bottom: var(--space-6);
    gap: var(--space-2);
  }

  h1 {
    font-size: clamp(28px, 4vw, 40px);
    letter-spacing: -0.03em;
    line-height: 1.1;
  }
  .version {
    color: var(--color-text-muted);
  }
  h2 {
    font-size: var(--font-size-xl);
    letter-spacing: -0.01em;
    line-height: 1.2;
  }
  h3 {
    margin-top: var(--space-3);
    font-size: var(--font-size-base);
  }
  .prose {
    max-width: 68ch;
    color: var(--color-text-dim);
  }
  .link {
    color: var(--color-text);
    text-decoration: underline;
    text-decoration-color: var(--color-border-hover);
    text-underline-offset: 4px;
  }

  .facts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1px;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-border);
  }
  .facts > div {
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg);
  }
  dt {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }
  dd {
    overflow-wrap: anywhere;
    color: var(--color-text-dim);
  }

  .note {
    padding: var(--space-4);
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-lg);
    color: var(--color-text-dim);
  }

  .scroll {
    overflow-x: auto;
  }
  table {
    width: 100%;
    min-width: 420px;
    border-collapse: collapse;
    font-size: 12px;
  }
  th,
  td {
    padding: 8px var(--space-3) 8px 0;
    border-bottom: 1px solid var(--color-border);
    text-align: left;
    vertical-align: top;
  }
  th {
    color: var(--color-text-muted);
    font-weight: 500;
  }
  td {
    color: var(--color-text-dim);
  }
  td:first-child {
    white-space: nowrap;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-3);
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    color: var(--color-text-dim);
    transition: border-color 0.15s ease;
  }
  .card:hover {
    border-color: var(--color-border-hover);
    color: var(--color-text-dim);
  }
  .card h3 {
    margin: 0;
    color: var(--color-text);
  }
  .tag {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }
  .more {
    margin-top: auto;
    color: var(--color-text);
  }

  .steps {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    list-style: none;
    counter-reset: step;
  }
  .steps li {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-left: var(--space-10);
    counter-increment: step;
  }
  .steps li::before {
    content: counter(step);
    position: absolute;
    top: 0;
    left: 0;
    width: 26px;
    height: 26px;
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-md);
    color: var(--color-text-dim);
    font-size: var(--font-size-xs);
    line-height: 24px;
    text-align: center;
  }
  .steps h3 {
    margin: 0;
  }

  .methods {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }
  .methods article {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding-bottom: var(--space-8);
    border-bottom: 1px solid var(--color-border);
  }
  .methods article:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }
  .sig {
    align-self: flex-start;
    padding: 2px var(--space-3);
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-sm);
    background: var(--color-bg-3);
    color: var(--color-text);
    word-break: break-all;
  }

  @media (min-width: 900px) {
    .sidebar {
      position: sticky;
      flex: none;
      align-self: flex-start;
      width: 240px;
      height: calc(100vh - var(--topbar));
      transform: none;
      z-index: auto;
    }
    .menu,
    .overlay {
      display: none;
    }
  }

  @media (max-width: 640px) {
    .topbar {
      padding-inline: var(--space-4);
    }
    .crumb {
      display: none;
    }
    .section {
      padding: var(--space-8) var(--space-4);
    }
    .steps li {
      padding-left: 0;
    }
    .steps li::before {
      position: static;
      margin-bottom: var(--space-1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sidebar,
    .card {
      transition: none;
    }
  }
</style>
