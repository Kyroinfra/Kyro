<script lang="ts">
  import { onMount } from "svelte";
  import Logo from "$lib/components/Logo.svelte";

  type HealthStatus = "checking" | "connected" | "degraded" | "error";

  let status: HealthStatus = $state("checking");
  let health: {
    uptime?: number;
    database?: string;
    redis?: string;
    timestamp?: string;
  } = $state({});

  onMount(async () => {
    try {
      const res = await fetch("/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      health = data;
      status = data.status === "ok" ? "connected" : "degraded";
    } catch {
      status = "error";
    }
  });

  function formatUptime(seconds: number): string {
    if (!seconds) return "—";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  const statusConfig = {
    checking: {
      label: "connecting...",
      color: "var(--color-warning)",
      dot: "pulse",
    },
    connected: {
      label: "all systems operational",
      color: "var(--color-success)",
      dot: "online",
    },
    degraded: { label: "degraded", color: "var(--color-warning)", dot: "warn" },
    error: {
      label: "backend unreachable",
      color: "var(--color-danger)",
      dot: "error",
    },
  };

  let cfg = $derived(statusConfig[status]);
</script>

<svelte:head>
  <title>Kyro — API Management Platform</title>
</svelte:head>

<div class="landing">
  <header class="header">
    <a href="/" class="logo">
      <Logo size={26} />
      <span class="logo-text">kyro</span>
    </a>
    <nav class="nav">
      <a href="/health" class="nav-link">status</a>
      <a href="/login" class="nav-link">sign in</a>
      <a href="/register" class="nav-cta">get started</a>
    </nav>
  </header>

  <div class="statusbar" style="--s: {cfg.color}">
    <span class="dot dot-{cfg.dot}"></span>
    <span class="status-text">{cfg.label}</span>
    {#if status === "connected" || status === "degraded"}
      <span class="sep">·</span>
      <span
        >db <span
          class="chip chip-{health.database === 'connected' ? 'ok' : 'err'}"
          >{health.database}</span
        ></span
      >
      <span class="sep">·</span>
      <span
        >redis <span
          class="chip chip-{health.redis === 'connected' ? 'ok' : 'err'}"
          >{health.redis}</span
        ></span
      >
      <span class="sep">·</span>
      <span class="muted">up {formatUptime(health.uptime ?? 0)}</span>
    {/if}
  </div>

  <main class="hero">
    <div class="hero-inner">
      <div class="terminal-line">
        <span class="term-prompt">$</span>
        <span class="term-cmd">kyro --init production</span>
        <span class="term-cursor"></span>
      </div>

      <h1 class="hero-title">
        Build with<br />
        <span class="accent">confidence.</span>
      </h1>
      <p class="hero-sub">
        API key management, real-time usage analytics, and file storage — in one
        unified platform built for engineering teams.
      </p>
      <div class="hero-cta">
        <a href="/register" class="cta-primary">start building free</a>
        <a href="/login" class="cta-ghost">sign in →</a>
      </div>
    </div>

    <div class="features">
      {#each [{ icon: "◇", title: "API Key Management", desc: "Create, scope, and revoke keys with fine-grained permission control." }, { icon: "↑", title: "Usage Analytics", desc: "Real-time dashboards with daily breakdowns and bandwidth tracking." }, { icon: "▤", title: "File Storage", desc: "Upload, serve, and manage files with per-org storage quotas." }, { icon: "⊙", title: "Rate Limiting", desc: "Redis-backed rate limiting protects your infrastructure automatically." }] as feat}
        <div class="feat-card">
          <span class="feat-icon">{feat.icon}</span>
          <h3>{feat.title}</h3>
          <p>{feat.desc}</p>
        </div>
      {/each}
    </div>
  </main>

  <footer class="footer">
    <span>© 2026 kyro</span>
    <a href="/health">system status</a>
  </footer>
</div>

<style>
  .landing {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--color-bg);
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-8);
    border-bottom: 1px solid var(--color-border);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    font-weight: 700;
    color: var(--color-text);
    text-decoration: none;
    text-transform: lowercase;
  }

  .logo-mark {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-text);
    color: var(--color-bg);
    border-radius: var(--radius-sm);
    font-weight: 700;
    font-size: 12px;
  }

  .nav {
    display: flex;
    align-items: center;
    gap: var(--space-5);
    font-family: var(--font-mono);
  }

  .nav-link {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    text-decoration: none;
    transition: color 0.1s;
  }

  .nav-link:hover {
    color: var(--color-text-dim);
  }

  .nav-cta {
    height: 30px;
    padding: 0 var(--space-4);
    background: var(--color-text);
    color: var(--color-bg);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-decoration: none;
    display: flex;
    align-items: center;
    transition: opacity 0.1s;
  }

  .nav-cta:hover {
    opacity: 0.85;
  }

  /* ── Status bar ── */
  .statusbar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 6px var(--space-8);
    background: var(--color-bg-2);
    border-bottom: 1px solid var(--color-border);
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dot-online {
    background: var(--color-success);
    box-shadow: 0 0 5px var(--color-success);
  }
  .dot-warn {
    background: var(--color-warning);
  }
  .dot-error {
    background: var(--color-danger);
  }
  .dot-pulse {
    background: var(--color-warning);
    animation: dpulse 1.2s ease-in-out infinite;
  }

  @keyframes dpulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.2;
    }
  }

  .status-text {
    color: var(--s);
    font-weight: 500;
  }
  .sep {
    color: var(--color-border-hover);
  }
  .muted {
    color: var(--color-text-ghost);
  }

  .chip {
    display: inline-flex;
    align-items: center;
    padding: 0 5px;
    height: 14px;
    border-radius: var(--radius-sm);
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .chip-ok {
    background: var(--color-success-dim);
    color: var(--color-success);
  }
  .chip-err {
    background: var(--color-danger-dim);
    color: var(--color-danger);
  }

  /* ── Hero ── */
  .hero {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-12) var(--space-8);
    gap: var(--space-12);
  }

  .hero-inner {
    max-width: 640px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-5);
  }

  .terminal-line {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--color-bg-2);
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-4);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
  }

  .term-prompt {
    color: var(--color-success);
    font-weight: 700;
  }

  .term-cmd {
    color: var(--color-text-dim);
  }

  .term-cursor {
    display: inline-block;
    width: 7px;
    height: 12px;
    background: var(--color-success);
    opacity: 0.6;
    animation: blink 1s step-end infinite;
    border-radius: 1px;
  }

  @keyframes blink {
    0%,
    100% {
      opacity: 0.6;
    }
    50% {
      opacity: 0;
    }
  }

  .hero-title {
    font-family: var(--font-mono);
    font-size: clamp(38px, 6vw, 58px);
    font-weight: 700;
    line-height: 1.1;
    color: var(--color-text);
    letter-spacing: -0.02em;
  }

  .accent {
    color: var(--color-success);
  }

  .hero-sub {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    line-height: 1.7;
    max-width: 500px;
  }

  .hero-cta {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
    justify-content: center;
  }

  .cta-primary {
    height: 42px;
    padding: 0 var(--space-6);
    background: var(--color-text);
    color: var(--color-bg);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    text-decoration: none;
    display: flex;
    align-items: center;
    transition: opacity 0.1s;
  }

  .cta-primary:hover {
    opacity: 0.85;
  }

  .cta-ghost {
    height: 42px;
    padding: 0 var(--space-4);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    text-decoration: none;
    display: flex;
    align-items: center;
    border: 1px solid var(--color-border-2);
    border-radius: var(--radius-md);
    transition: all 0.1s;
  }

  .cta-ghost:hover {
    color: var(--color-text-dim);
    border-color: var(--color-border-hover);
  }

  /* ── Feature cards ── */
  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-3);
    width: 100%;
    max-width: 880px;
  }

  .feat-card {
    padding: var(--space-5);
    background: var(--color-bg-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    transition: border-color 0.1s ease;
  }

  .feat-card:hover {
    border-color: var(--color-border-2);
  }

  .feat-icon {
    display: block;
    font-size: 18px;
    color: var(--color-text-muted);
    margin-bottom: var(--space-3);
    font-family: var(--font-mono);
  }

  .feat-card h3 {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: var(--space-2);
  }

  .feat-card p {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    line-height: 1.6;
  }

  /* ── Footer ── */
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-8);
    border-top: 1px solid var(--color-border);
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-ghost);
  }

  .footer a {
    color: var(--color-text-ghost);
    text-decoration: none;
    transition: color 0.1s;
  }

  .footer a:hover {
    color: var(--color-text-muted);
  }
  @media (max-width: 640px) {
    .header {
      padding: var(--space-3) var(--space-4);
    }

    .nav-link {
      display: none;
    }

    .statusbar {
      padding: 6px var(--space-4);
      overflow-x: auto;
      white-space: nowrap;
      flex-wrap: nowrap;
    }

    .hero {
      padding: var(--space-8) var(--space-4);
      gap: var(--space-8);
    }

    .hero-inner {
      gap: var(--space-4);
    }

    .terminal-line {
      font-size: 11px;
      padding: var(--space-2) var(--space-3);
    }

    .hero-title {
      font-size: 32px;
    }

    .hero-cta {
      flex-direction: column;
      width: 100%;
    }

    .cta-primary,
    .cta-ghost {
      width: 100%;
      justify-content: center;
    }

    .features {
      grid-template-columns: 1fr;
      padding: 0 var(--space-4);
    }

    .footer {
      padding: var(--space-4);
      font-size: 10px;
    }
  }

  @media (max-width: 900px) {
    .header {
      padding: var(--space-3) var(--space-5);
    }

    .hero {
      padding: var(--space-10) var(--space-5);
    }

    .features {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
