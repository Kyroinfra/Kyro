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
        degraded: {
            label: "degraded",
            color: "var(--color-warning)",
            dot: "warn",
        },
        error: {
            label: "backend unreachable",
            color: "var(--color-danger)",
            dot: "error",
        },
    };

    let cfg = $derived(statusConfig[status]);

    const steps = [
        {
            n: "01",
            title: "Deploy in one command",
            desc: "docker compose up — Postgres, Redis, and Kyro running locally.",
        },
        {
            n: "02",
            title: "Upload your documents",
            desc: "PDFs, DOCX, plain text. Extraction and embedding happen automatically.",
        },
        {
            n: "03",
            title: "Ask questions via API",
            desc: "POST /v2/files/ask with a question and file IDs. Get answers with citations, streamed in real-time.",
        },
    ];

    const features = [
        {
            icon: "◇",
            title: "Ask Your Documents",
            desc: "Upload a file, ask a question, get an answer with citations.Runs against your own Ollama instance.",
        },
        {
            icon: "↑",
            title: "Semantic Search",
            desc: "   Vector similarity search across your entire knowledge base. No embedding APIs, no third-party calls.",
        },
        {
            icon: "▤",
            title: "Self-Hosted by Design",
            desc: " Postgres + local storage + your own LLM. One Docker Compose. Your data physically never leaves your server.",
        },
        {
            icon: "⊙",
            title: "Multi-tenant Ready",
            desc: "Orgs, API keys, scoped access. Ship it to your team or embed it in your product.",
        },
    ];
</script>

<svelte:head>
    <title>Kyro — API Management Platform</title>
</svelte:head>

<div class="landing">
    <!-- TODO: Remove /v2/files from steps -->
    <!-- ── Header ── -->
    <header class="header">
        <a href="/" class="logo">
            <Logo size={26} />
            <span class="logo-text">kyro</span>
        </a>
        <nav class="nav">
            <a href="/docs" class="nav-link">docs</a>
            <a href="/health" class="nav-link">status</a>
            <a href="/login" class="nav-link">sign in</a>
        </nav>
    </header>

    <!-- ── Status bar ── -->
    <div class="statusbar" style="--s: {cfg.color}">
        <span class="dot dot-{cfg.dot}"></span>
        <span class="status-text">{cfg.label}</span>
        {#if status === "connected" || status === "degraded"}
            <span class="sep">·</span>
            <span
                >db <span
                    class="chip chip-{health.database === 'connected'
                        ? 'ok'
                        : 'err'}">{health.database}</span
                ></span
            >
            <span class="sep">·</span>
            <span
                >redis <span
                    class="chip chip-{health.redis === 'connected'
                        ? 'ok'
                        : 'err'}">{health.redis}</span
                ></span
            >
            <span class="sep">·</span>
            <span class="muted">up {formatUptime(health.uptime ?? 0)}</span>
        {/if}
    </div>

    <main>
        <!-- ── Hero ── -->
        <section class="hero">
            <div class="hero-inner">
                <div class="terminal-line">
                    <span class="term-prompt">$</span>
                    <span class="term-cmd"
                        >kyro ask "what's the renewal date?" --files contracts/</span
                    >
                    <span class="term-cursor"></span>
                </div>

                <h1 class="hero-title">
                    <!-- The API platform<br /> -->
                    <!-- teams <span class="accent">actually ship with.</span> -->
                    RAG without the data
                    <span class="accent">leak.</span>
                </h1>

                <!-- TODO: Codebases -->
                <p class="hero-sub">
                    Upload PDFs, contracts, or codebases — then ask questions in
                    plain English. Everything runs on your infrastructure.
                    OpenAI never sees a byte.
                </p>

                <div class="hero-cta">
                    <a href="/register" class="cta-primary"
                        >start building free →</a
                    >
                    <a href="/docs" class="cta-ghost">read the docs</a>
                </div>

                <div class="hero-proof">
                    <span class="proof-item">
                        <span class="proof-dot"></span>no credit card required
                    </span>
                    <span class="proof-sep">·</span>
                    <span class="proof-item">
                        <span class="proof-dot"></span>free tier included
                    </span>
                    <span class="proof-sep">·</span>
                    <span class="proof-item">
                        <span class="proof-dot"></span>10 min integration
                    </span>
                </div>
            </div>

            <!-- Code snippet panel -->
            <div class="hero-code">
                <div class="code-header">
                    <div class="code-dots">
                        <span></span><span></span><span></span>
                    </div>
                    <span class="code-title">quickstart.ts</span>
                </div>
                <pre class="code-body"><span class="c-kw">import</span> <span
                        class="c-brace">&#123;</span
                    > KyroClient <span class="c-brace">&#125;</span> <span
                        class="c-kw">from</span
                    > <span class="c-str">"@kyro/sdk"</span><span class="c-dim"
                        >;</span
                    >

<span class="c-kw">const</span> client <span class="c-dim">=</span> <span
                        class="c-kw">new</span
                    > <span class="c-fn">KyroClient</span><span class="c-brace"
                        >(&#123;</span
                    >
  apiKey<span class="c-dim">:</span> process<span class="c-dim">.</span>env<span
                        class="c-dim">.</span
                    ><span class="c-prop">KYRO_API_KEY</span><span class="c-dim"
                        >,</span
                    >
<span class="c-brace">&#125;)</span><span class="c-dim">;</span>

<span class="c-comment">// Upload a file</span>
<span class="c-kw">const</span> file <span class="c-dim">=</span> <span
                        class="c-kw">await</span
                    > client<span class="c-dim">.</span>files<span class="c-dim"
                        >.</span
                    ><span class="c-fn">upload</span><span class="c-brace"
                        >(&#123;</span
                    >
  name<span class="c-dim">:</span> <span class="c-str">"report.pdf"</span><span
                        class="c-dim">,</span
                    >
  data<span class="c-dim">:</span> buffer<span class="c-dim">,</span>
<span class="c-brace">&#125;)</span><span class="c-dim">;</span>

<span class="c-comment">// Get a public URL</span>
console<span class="c-dim">.</span><span class="c-fn">log</span><span
                        class="c-brace">(</span
                    >file<span class="c-dim">.</span><span class="c-prop"
                        >url</span
                    ><span class="c-brace">)</span><span class="c-dim">;</span>
<span class="c-success">// → https://cdn.kyro.dev/org/abc/report.pdf</span
                    ></pre>
            </div>
        </section>

        <!-- ── Features ── -->
        <section class="features-section">
            <div class="section-label">platform</div>
            <h2 class="section-title">Everything in one place</h2>
            <div class="features">
                {#each features as feat}
                    <div class="feat-card">
                        <span class="feat-icon">{feat.icon}</span>
                        <h3>{feat.title}</h3>
                        <p>{feat.desc}</p>
                    </div>
                {/each}
            </div>
        </section>

        <!-- ── How it works ── -->
        <section class="steps-section">
            <div class="section-label">getting started</div>
            <h2 class="section-title">Up and running in minutes</h2>
            <div class="steps">
                {#each steps as step, i}
                    <div class="step">
                        <div class="step-number">{step.n}</div>
                        <div class="step-content">
                            <h3>{step.title}</h3>
                            <p>{step.desc}</p>
                        </div>
                        {#if i < steps.length - 1}
                            <div class="step-connector"></div>
                        {/if}
                    </div>
                {/each}
            </div>
        </section>

        <!-- ── CTA strip ── -->
        <section class="cta-section">
            <div class="cta-inner">
                <div class="terminal-line terminal-sm">
                    <span class="term-prompt">$</span>
                    <span class="term-cmd">npm install @kyro/sdk</span>
                    <span class="term-cursor"></span>
                </div>
                <h2 class="cta-title">Your knowledge base. Your rules.</h2>
                <p class="cta-sub">
                    Start with the free tier. Scale when you need to.
                </p>
                <div class="cta-btns">
                    <a href="/register" class="cta-primary"
                        >create your account</a
                    >
                    <a href="/docs" class="cta-ghost">explore the docs →</a>
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <span>© 2026 kyro</span>
        <div class="footer-links">
            <a href="/docs">docs</a>
            <a href="/health">status</a>
        </div>
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
        position: sticky;
        top: 0;
        background: var(--color-bg);
        z-index: 10;
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
    }

    .nav {
        display: flex;
        align-items: center;
        gap: var(--space-6);
        font-family: var(--font-mono);
    }

    .nav-link {
        color: var(--color-text-muted);
        font-size: var(--font-size-xs);
        text-decoration: none;
        transition: color 0.1s;
    }

    .nav-link:hover {
        color: var(--color-text);
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
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-12);
        align-items: center;
        padding: var(--space-16) var(--space-8);
        max-width: 1100px;
        margin: 0 auto;
        width: 100%;
    }

    .hero-inner {
        display: flex;
        flex-direction: column;
        gap: var(--space-5);
    }

    .terminal-line {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        background: var(--color-bg-2);
        border: 1px solid var(--color-border-2);
        border-radius: var(--radius-md);
        padding: var(--space-2) var(--space-4);
        font-family: var(--font-mono);
        font-size: var(--font-size-xs);
        width: fit-content;
    }

    .terminal-sm {
        font-size: var(--font-size-2xs);
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
        font-size: clamp(32px, 4.5vw, 52px);
        font-weight: 700;
        line-height: 1.12;
        color: var(--color-text);
        letter-spacing: -0.02em;
        margin: 0;
    }

    .accent {
        color: var(--color-success);
    }

    .hero-sub {
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        line-height: 1.75;
        max-width: 480px;
        margin: 0;
    }

    .hero-cta {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        flex-wrap: wrap;
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
        white-space: nowrap;
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
        white-space: nowrap;
    }

    .cta-ghost:hover {
        color: var(--color-text);
        border-color: var(--color-border-hover);
    }

    .hero-proof {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        font-family: var(--font-mono);
        font-size: var(--font-size-2xs);
        color: var(--color-text-ghost);
        flex-wrap: wrap;
    }

    .proof-item {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .proof-dot {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: var(--color-success);
        opacity: 0.6;
    }

    .proof-sep {
        color: var(--color-border-hover);
    }

    /* ── Code panel ── */
    .hero-code {
        background: var(--color-bg-2);
        border: 1px solid var(--color-border-2);
        border-radius: var(--radius-lg);
        overflow: hidden;
        font-family: var(--font-mono);
    }

    .code-header {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        border-bottom: 1px solid var(--color-border);
        background: var(--color-bg);
    }

    .code-dots {
        display: flex;
        gap: 5px;
    }

    .code-dots span {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--color-border-2);
    }

    .code-title {
        font-size: var(--font-size-2xs);
        color: var(--color-text-ghost);
    }

    .code-body {
        margin: 0;
        padding: var(--space-5) var(--space-5);
        font-size: var(--font-size-xs);
        line-height: 1.75;
        overflow-x: auto;
        color: var(--color-text-dim);
        white-space: pre;
    }

    .c-kw {
        color: var(--color-success);
    }
    .c-fn {
        color: var(--color-text);
    }
    .c-str {
        color: var(--color-warning, #d4a854);
    }
    .c-prop {
        color: var(--color-text-dim);
    }
    .c-dim {
        color: var(--color-text-ghost);
    }
    .c-brace {
        color: var(--color-text-muted);
    }
    .c-comment {
        color: var(--color-text-ghost);
        font-style: italic;
    }
    .c-success {
        color: var(--color-success);
        opacity: 0.7;
    }

    /* ── Shared section layout ── */
    .features-section,
    .steps-section {
        padding: var(--space-16) var(--space-8);
        max-width: 1100px;
        margin: 0 auto;
        width: 100%;
        border-top: 1px solid var(--color-border);
    }

    .section-label {
        font-family: var(--font-mono);
        font-size: var(--font-size-2xs);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--color-success);
        margin-bottom: var(--space-3);
        font-weight: 600;
    }

    .section-title {
        font-family: var(--font-mono);
        font-size: clamp(22px, 3vw, 32px);
        font-weight: 700;
        color: var(--color-text);
        letter-spacing: -0.02em;
        margin: 0 0 var(--space-8) 0;
    }

    /* ── Features ── */
    .features {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--space-3);
    }

    .feat-card {
        padding: var(--space-5);
        background: var(--color-bg-2);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        transition: border-color 0.15s ease;
    }

    .feat-card:hover {
        border-color: var(--color-border-hover);
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
        margin: 0 0 var(--space-2) 0;
    }

    .feat-card p {
        font-family: var(--font-mono);
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        line-height: 1.65;
        margin: 0;
    }

    /* ── Steps ── */
    .steps {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0;
        position: relative;
    }

    .step {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-6);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        background: var(--color-bg-2);
        position: relative;
    }

    .step + .step {
        margin-left: var(--space-3);
    }

    .step-number {
        font-family: var(--font-mono);
        font-size: var(--font-size-2xs);
        font-weight: 700;
        color: var(--color-success);
        letter-spacing: 0.05em;
    }

    .step-content h3 {
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
        font-weight: 600;
        color: var(--color-text);
        margin: 0 0 var(--space-2) 0;
    }

    .step-content p {
        font-family: var(--font-mono);
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        line-height: 1.65;
        margin: 0;
    }

    /* ── CTA section ── */
    .cta-section {
        border-top: 1px solid var(--color-border);
        padding: var(--space-16) var(--space-8);
    }

    .cta-inner {
        max-width: 560px;
        margin: 0 auto;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-4);
    }

    .cta-title {
        font-family: var(--font-mono);
        font-size: clamp(26px, 3.5vw, 40px);
        font-weight: 700;
        color: var(--color-text);
        letter-spacing: -0.02em;
        margin: 0;
    }

    .cta-sub {
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        margin: 0;
    }

    .cta-btns {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        flex-wrap: wrap;
        justify-content: center;
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

    .footer-links {
        display: flex;
        gap: var(--space-4);
    }

    .footer a {
        color: var(--color-text-ghost);
        text-decoration: none;
        transition: color 0.1s;
    }

    .footer a:hover {
        color: var(--color-text-muted);
    }

    /* ── Responsive ── */
    @media (max-width: 900px) {
        .header {
            padding: var(--space-3) var(--space-5);
        }

        .hero {
            grid-template-columns: 1fr;
            padding: var(--space-10) var(--space-5);
            gap: var(--space-8);
        }

        .hero-code {
            display: none;
        }

        .features {
            grid-template-columns: repeat(2, 1fr);
        }

        .steps {
            grid-template-columns: 1fr;
            gap: var(--space-3);
        }

        .step + .step {
            margin-left: 0;
        }

        .features-section,
        .steps-section {
            padding: var(--space-10) var(--space-5);
        }

        .cta-section {
            padding: var(--space-10) var(--space-5);
        }
    }

    @media (max-width: 640px) {
        .header {
            padding: var(--space-3) var(--space-4);
        }

        .statusbar {
            padding: 6px var(--space-4);
            overflow-x: auto;
            white-space: nowrap;
        }

        .hero {
            padding: var(--space-8) var(--space-4);
            gap: var(--space-6);
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
        }

        .hero-proof {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-2);
        }

        .proof-sep {
            display: none;
        }

        .features-section,
        .steps-section {
            padding: var(--space-8) var(--space-4);
        }

        .cta-section {
            padding: var(--space-8) var(--space-4);
        }

        .footer {
            padding: var(--space-4);
            font-size: 10px;
        }
    }
</style>
