<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import Logo from "$lib/components/Logo.svelte";

    type HealthStatus = "checking" | "connected" | "degraded" | "error";

    let status: HealthStatus = $state("checking");
    let health: {
        uptime?: number;
        database?: string;
        redis?: string;
        timestamp?: string;
    } = $state({});

    let canvasEl: HTMLCanvasElement | undefined = $state();
    let heroSection: HTMLElement | undefined;
    let scrolled = $state(false);
    let threeLoaded = $state(false);
    let canvasVisible = $state(true);

    let threeCleanup: (() => void) | null = null;

    async function loadThree() {
        try {
            const THREE = await import("three");

            const prefersReduced = window.matchMedia(
                "(prefers-reduced-motion: reduce)",
            ).matches;
            const lowPower =
                window.innerWidth < 768 ||
                (navigator.hardwareConcurrency ?? 4) < 4;

            if (prefersReduced || !canvasEl) {
                canvasVisible = false;
                return;
            }

            threeLoaded = true;

            const renderer = new THREE.WebGLRenderer({
                canvas: canvasEl,
                antialias: !lowPower,
                alpha: true,
                powerPreference: lowPower ? "low-power" : "high-performance",
            });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setClearColor(0x000000, 0);

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
            camera.position.set(0, 0, 5);

            const icoGeo = new THREE.IcosahedronGeometry(1.5, 1);
            const icoMat = new THREE.MeshBasicMaterial({
                color: 0x00cc66,
                wireframe: true,
                transparent: true,
                opacity: 0.35,
            });
            const ico = new THREE.Mesh(icoGeo, icoMat);
            scene.add(ico);

            const innerGeo = new THREE.IcosahedronGeometry(1.38, 1);
            const innerMat = new THREE.MeshBasicMaterial({
                color: 0x00cc66,
                transparent: true,
                opacity: 0.04,
                side: THREE.BackSide,
            });
            const inner = new THREE.Mesh(innerGeo, innerMat);
            scene.add(inner);

            const ringGeo = new THREE.TorusGeometry(2.1, 0.008, 4, 80);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0x00cc66,
                transparent: true,
                opacity: 0.18,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            scene.add(ring);

            const ring2 = new THREE.Mesh(
                new THREE.TorusGeometry(2.4, 0.005, 4, 80),
                new THREE.MeshBasicMaterial({
                    color: 0x00cc66,
                    transparent: true,
                    opacity: 0.1,
                }),
            );
            ring2.rotation.x = Math.PI / 3;
            ring2.rotation.z = Math.PI / 6;
            scene.add(ring2);

            const count = lowPower ? 180 : 380;
            const positions = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
                const r = 2.8 + Math.random() * 1.6;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
                positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
                positions[i * 3 + 2] = r * Math.cos(phi);
            }
            const particleGeo = new THREE.BufferGeometry();
            particleGeo.setAttribute(
                "position",
                new THREE.BufferAttribute(positions, 3),
            );
            const particleMat = new THREE.PointsMaterial({
                color: 0x00cc66,
                size: lowPower ? 0.025 : 0.018,
                transparent: true,
                opacity: 0.55,
                sizeAttenuation: true,
            });
            const particles = new THREE.Points(particleGeo, particleMat);
            scene.add(particles);

            const resize = () => {
                if (!canvasEl) return;
                const rect = canvasEl.parentElement!.getBoundingClientRect();
                renderer.setSize(rect.width, rect.height, false);
                camera.aspect = rect.width / rect.height;
                camera.updateProjectionMatrix();
            };
            resize();
            const ro = new ResizeObserver(resize);
            if (canvasEl.parentElement) ro.observe(canvasEl.parentElement);

            // FIX 1: removed leading minus from my so vertical mouse movement maps correctly
            let mx = 0,
                my = 0,
                tmx = 0,
                tmy = 0;
            const onMouse = (e: MouseEvent) => {
                mx = (e.clientX / window.innerWidth - 0.5) * 2;
                my = (e.clientY / window.innerHeight - 0.5) * 2;
            };
            window.addEventListener("mousemove", onMouse, { passive: true });

            let raf: number;
            let t = 0;
            const animate = () => {
                raf = requestAnimationFrame(animate);
                t += 0.006;

                // FIX 2: lerp factor 0.04 → 0.1 for snappier tracking
                tmx += (mx - tmx) * 0.1;
                tmy += (my - tmy) * 0.1;

                // FIX 3: mouse multiplier 0.15 → 0.5 so it actually drives the rotation
                ico.rotation.x = t * 0.18 + tmy * 0.5;
                ico.rotation.y = t * 0.26 + tmx * 0.5;
                inner.rotation.copy(ico.rotation);

                ring.rotation.y = t * 0.08;
                ring2.rotation.z = t * 0.05 + Math.PI / 6;

                // FIX 4: particles also react to mouse, at half the ico multiplier
                particles.rotation.y = -t * 0.04 + tmx * 0.2;
                particles.rotation.x = t * 0.02 + tmy * 0.2;

                const breathe = 1 + Math.sin(t * 0.9) * 0.025;
                ico.scale.setScalar(breathe);
                inner.scale.setScalar(breathe);

                renderer.render(scene, camera);
            };
            animate();

            threeCleanup = () => {
                cancelAnimationFrame(raf);
                window.removeEventListener("mousemove", onMouse);
                ro.disconnect();
                renderer.dispose();
                icoGeo.dispose();
                icoMat.dispose();
                innerGeo.dispose();
                innerMat.dispose();
                ringGeo.dispose();
                ringMat.dispose();
                particleGeo.dispose();
                particleMat.dispose();
            };
        } catch (err) {
            console.warn("Three.js failed to load, hiding canvas", err);
            canvasVisible = false;
        }
    }

    onMount(() => {
        // ── Health check ──────────────────────────────────────────────────
        fetch("/health")
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data) => {
                health = data;
                status = data.status === "ok" ? "connected" : "degraded";
            })
            .catch(() => {
                status = "error";
            });

        // ── Scroll detection for header ───────────────────────────────────
        const onScroll = () => {
            scrolled = window.scrollY > 20;
        };
        window.addEventListener("scroll", onScroll, { passive: true });

        // ── Intersection observer for reveal animations ───────────────────
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        e.target.classList.add("revealed");
                        observer.unobserve(e.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
        );
        document
            .querySelectorAll(".reveal")
            .forEach((el) => observer.observe(el));

        // ── Kick off Three.js (async, no return value) ────────────────────
        loadThree();

        // ── Sync cleanup only ─────────────────────────────────────────────
        return () => {
            window.removeEventListener("scroll", onScroll);
            observer.disconnect();
        };
    });

    onDestroy(() => {
        threeCleanup?.();
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

    const features = [
        {
            icon: "◇",
            tag: "QUERY",
            title: "Ask Your Documents",
            desc: "Upload a file, ask a question, get an answer with inline citations. Runs entirely against your local Ollama instance.",
        },
        {
            icon: "↑",
            tag: "SEARCH",
            title: "Semantic Search",
            desc: "pgvector-powered similarity search across your entire knowledge base. Zero third-party embedding APIs.",
        },
        {
            icon: "▤",
            tag: "INFRA",
            title: "Self-Hosted by Design",
            desc: "Postgres + local storage + your own LLM. One Docker Compose command. Your data never leaves your server.",
        },
        {
            icon: "⊙",
            tag: "SCALE",
            title: "Multi-tenant Ready",
            desc: "Orgs, scoped API keys, role-based access. Ship it to your team or embed it directly in your product.",
        },
    ];

    const steps = [
        {
            n: "01",
            title: "Deploy in one command",
            desc: "docker compose up — Postgres, Redis, Ollama, and Kyro running locally in under two minutes.",
            cmd: "docker compose up -d",
        },
        {
            n: "02",
            title: "Upload your documents",
            desc: "PDFs, DOCX, plain text. Text extraction and vector embedding happen automatically in the background.",
            cmd: "POST /api/v2/files",
        },
        {
            n: "03",
            title: "Ask questions via API",
            desc: "Send a question and file IDs. Get streamed answers with source citations — no hallucination, grounded in your data.",
            cmd: "POST /api/v2/files/ask",
        },
    ];

    const socialProof = [
        { stat: "< 2 min", label: "to first answer" },
        { stat: "100%", label: "data stays local" },
        { stat: "0", label: "third-party AI calls" },
    ];
</script>

<svelte:head>
    <title>Kyro — RAG without the data leak</title>
    <meta
        name="description"
        content="Upload documents, ask questions in plain English. Everything runs on your infrastructure. OpenAI never sees a byte."
    />
</svelte:head>

<div class="landing">
    <!-- ══════════════════════ HEADER ══════════════════════ -->
    <header class="header" class:scrolled>
        <a href="/" class="logo" aria-label="Kyro home">
            <Logo size={24} />
            <span class="logo-text">kyro</span>
        </a>
        <nav class="nav" aria-label="Primary navigation">
            <a href="/docs" class="nav-link">docs</a>
            <a href="/health" class="nav-link">status</a>
            <a href="/login" class="nav-link">sign in</a>
            <a href="/register" class="nav-cta">get started →</a>
        </nav>
        <!-- Mobile menu toggle (visible ≤640px) -->
        <a href="/register" class="nav-cta-mobile">start free</a>
    </header>

    <!-- ══════════════════════ STATUS BAR ══════════════════════ -->
    <div
        class="statusbar"
        style="--s: {cfg.color}"
        role="status"
        aria-live="polite"
    >
        <span class="dot dot-{cfg.dot}" aria-hidden="true"></span>
        <span class="status-text">{cfg.label}</span>
        {#if status === "connected" || status === "degraded"}
            <span class="sep" aria-hidden="true">·</span>
            <span
                >db <span
                    class="chip chip-{health.database === 'connected'
                        ? 'ok'
                        : 'err'}">{health.database}</span
                ></span
            >
            <span class="sep" aria-hidden="true">·</span>
            <span
                >redis <span
                    class="chip chip-{health.redis === 'connected'
                        ? 'ok'
                        : 'err'}">{health.redis}</span
                ></span
            >
            <span class="sep" aria-hidden="true">·</span>
            <span class="muted">up {formatUptime(health.uptime ?? 0)}</span>
        {/if}
    </div>

    <main>
        <!-- ══════════════════════ HERO ══════════════════════ -->
        <section class="hero" bind:this={heroSection} aria-label="Hero">
            <div class="hero-left">
                <div class="hero-badge reveal">
                    <span class="badge-dot" aria-hidden="true"></span>
                    <span>Self-hosted RAG · Runs on your infra</span>
                </div>

                <h1 class="hero-title reveal">
                    RAG without<br />the data <span class="accent">leak.</span>
                </h1>

                <p class="hero-sub reveal">
                    Upload PDFs, contracts, or codebases — then ask questions in
                    plain English. Everything runs on your infrastructure.
                    OpenAI never sees a byte.
                </p>

                <div class="hero-cta reveal">
                    <a href="/register" class="btn-primary">
                        <span>Start building free</span>
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            aria-hidden="true"
                            ><path d="M5 12h14M12 5l7 7-7 7" /></svg
                        >
                    </a>
                    <a href="/docs" class="btn-ghost">read the docs</a>
                </div>

                <div class="hero-proof reveal" aria-label="Key statistics">
                    {#each socialProof as item}
                        <div class="proof-item">
                            <span class="proof-stat">{item.stat}</span>
                            <span class="proof-label">{item.label}</span>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- 3D Canvas -->
            <div class="hero-canvas-wrap" aria-hidden="true">
                {#if canvasVisible}
                    <canvas
                        bind:this={canvasEl}
                        class="hero-canvas"
                        class:loaded={threeLoaded}
                    ></canvas>
                    <div class="canvas-glow" aria-hidden="true"></div>
                {:else}
                    <!-- Fallback: static decorative element -->
                    <div class="canvas-fallback" aria-hidden="true">
                        <div class="fallback-ico">◇</div>
                    </div>
                {/if}

                <!-- Floating code card overlay -->
                <div class="float-card float-card-1 reveal">
                    <div class="float-card-dot"></div>
                    <span class="float-card-text">embedding complete</span>
                    <span class="float-card-sub">247 chunks · 12 files</span>
                </div>

                <div class="float-card float-card-2 reveal">
                    <div class="float-card-label">latency</div>
                    <div class="float-card-value">142<span>ms</span></div>
                </div>
            </div>
        </section>

        <!-- ══════════════════════ CODE DEMO ══════════════════════ -->
        <section class="demo-section reveal" aria-labelledby="demo-heading">
            <div class="demo-label">// quick start</div>
            <div class="demo-grid">
                <div class="demo-text">
                    <h2 id="demo-heading" class="demo-title">
                        One endpoint.<br />Infinite answers.
                    </h2>
                    <p class="demo-desc">
                        The <code>/ask</code> endpoint accepts a question and a list
                        of file IDs. It retrieves relevant chunks via vector similarity,
                        builds a grounded prompt, and streams back an answer with
                        source citations — all on your own server.
                    </p>
                    <div class="demo-chips">
                        <span class="chip-tag">streaming SSE</span>
                        <span class="chip-tag">source citations</span>
                        <span class="chip-tag">local LLM</span>
                    </div>
                </div>

                <div class="demo-code">
                    <div class="code-header">
                        <div class="code-dots" aria-hidden="true">
                            <span></span><span></span><span></span>
                        </div>
                        <span class="code-filename">ask.ts</span>
                        <span class="code-lang-tag">typescript</span>
                    </div>
                    <pre class="code-body" aria-label="Code example"><code
                            ><span class="c-comment"
                                >// Ask a question across your documents</span
                            >
<span class="c-kw">const</span> stream <span class="c-dim">=</span> <span
                                class="c-kw">await</span
                            > <span class="c-fn">fetch</span><span
                                class="c-brace">(</span
                            ><span class="c-str">"/api/v2/files/ask"</span><span
                                class="c-dim">,</span
                            > <span class="c-brace">{"{"}</span>
  method<span class="c-dim">:</span>  <span class="c-str">"POST"</span><span
                                class="c-dim">,</span
                            >
  headers<span class="c-dim">:</span> <span class="c-brace">{"{"}</span> <span
                                class="c-str">"X-API-Key"</span
                            ><span class="c-dim">:</span> process<span
                                class="c-dim">.</span
                            >env<span class="c-dim">.</span><span class="c-prop"
                                >KYRO_KEY</span
                            > <span class="c-brace">{"}"}</span><span
                                class="c-dim">,</span
                            >
  body<span class="c-dim">:</span> <span class="c-prop">JSON</span><span
                                class="c-dim">.</span
                            ><span class="c-fn">stringify</span><span
                                class="c-brace">({"{"}</span
                            >
    question<span class="c-dim">:</span> <span class="c-str"
                                >"What are the payment terms?"</span
                            ><span class="c-dim">,</span>
    fileIds<span class="c-dim">:</span>  <span class="c-brace">[</span><span
                                class="c-str">"uuid-1"</span
                            ><span class="c-dim">,</span> <span class="c-str"
                                >"uuid-2"</span
                            ><span class="c-brace">],</span>
    topK<span class="c-dim">:</span>     <span class="c-num">8</span><span
                                class="c-dim">,</span
                            >
  <span class="c-brace">{"}"}</span>)<span class="c-dim">,</span>
<span class="c-brace">{"}"}</span>)<span class="c-dim">;</span>

<span class="c-comment">// Response streams SSE events:</span>
<span class="c-success"
                                >// {"{"} type: "sources",  sources: [{"{"} fileId, score, content {"}"}] {"}"}</span
                            >
<span class="c-success"
                                >// {"{"} type: "chunk",    text: "According to [1], payment..." {"}"}</span
                            >
<span class="c-success">// {"{"} type: "done" {"}"}</span></code
                        ></pre>
                </div>
            </div>
        </section>

        <!-- ══════════════════════ FEATURES ══════════════════════ -->
        <section class="features-section" aria-labelledby="features-heading">
            <div class="section-eyebrow reveal">platform</div>
            <h2 id="features-heading" class="section-title reveal">
                Built different by design.
            </h2>
            <div class="features-grid">
                {#each features as feat, i}
                    <div class="feat-card reveal" style="--delay: {i * 70}ms">
                        <div class="feat-top">
                            <span class="feat-icon" aria-hidden="true"
                                >{feat.icon}</span
                            >
                            <span class="feat-tag">{feat.tag}</span>
                        </div>
                        <h3 class="feat-title">{feat.title}</h3>
                        <p class="feat-desc">{feat.desc}</p>
                        <div class="feat-line" aria-hidden="true"></div>
                    </div>
                {/each}
            </div>
        </section>

        <!-- ══════════════════════ HOW IT WORKS ══════════════════════ -->
        <section class="steps-section" aria-labelledby="steps-heading">
            <div class="section-eyebrow reveal">getting started</div>
            <h2 id="steps-heading" class="section-title reveal">
                Up and running in minutes.
            </h2>
            <div class="steps-grid">
                {#each steps as step, i}
                    <div
                        class="step-card reveal"
                        style="--delay: {i * 90}ms"
                        aria-label="Step {step.n}"
                    >
                        <div class="step-num" aria-hidden="true">{step.n}</div>
                        <div class="step-content">
                            <h3 class="step-title">{step.title}</h3>
                            <p class="step-desc">{step.desc}</p>
                            <div
                                class="step-cmd"
                                role="code"
                                aria-label="Command: {step.cmd}"
                            >
                                <span class="term-prompt" aria-hidden="true"
                                    >$</span
                                >
                                <span>{step.cmd}</span>
                            </div>
                        </div>
                        {#if i < steps.length - 1}
                            <div class="step-connector" aria-hidden="true">
                                <span>→</span>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </section>

        <!-- ══════════════════════ CTA ══════════════════════ -->
        <section class="cta-section reveal" aria-labelledby="cta-heading">
            <div class="cta-glow" aria-hidden="true"></div>
            <div class="cta-inner">
                <div class="cta-badge">
                    <span class="badge-dot" aria-hidden="true"></span>
                    <span>Free to self-host · MIT licensed</span>
                </div>
                <h2 id="cta-heading" class="cta-title">
                    Your knowledge base.<br />Your rules.
                </h2>
                <p class="cta-sub">
                    Start with the free tier. No credit card. No vendor lock-in.
                    Your documents never leave your server.
                </p>
                <div class="cta-btns">
                    <a href="/register" class="btn-primary btn-lg">
                        <span>Create your account</span>
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            aria-hidden="true"
                            ><path d="M5 12h14M12 5l7 7-7 7" /></svg
                        >
                    </a>
                    <a href="/docs" class="btn-ghost btn-lg"
                        >explore the docs →</a
                    >
                </div>
                <div class="cta-term" aria-label="Quick start command">
                    <span class="term-prompt" aria-hidden="true">$</span>
                    <span class="term-cmd">docker compose up -d</span>
                    <span class="term-cursor" aria-hidden="true"></span>
                </div>
            </div>
        </section>
    </main>

    <!-- ══════════════════════ FOOTER ══════════════════════ -->
    <footer class="footer">
        <span>© 2026 kyro</span>
        <nav class="footer-links" aria-label="Footer navigation">
            <a href="/docs">docs</a>
            <a href="/health">status</a>
        </nav>
    </footer>
</div>

<style>
    /* ═══════════════════════════════════════════
     RESET & BASE
  ═══════════════════════════════════════════ */
    .landing {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background: var(--color-bg);
        overflow-x: hidden;
    }

    /* ─── Reveal animation system ───────────────── */
    :global(.reveal) {
        opacity: 0;
        transform: translateY(22px);
        transition:
            opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        transition-delay: var(--delay, 0ms);
    }
    :global(.reveal.revealed) {
        opacity: 1;
        transform: translateY(0);
    }

    /* ═══════════════════════════════════════════
     HEADER
  ═══════════════════════════════════════════ */
    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px var(--space-8);
        position: sticky;
        top: 0;
        z-index: 50;
        background: transparent;
        border-bottom: 1px solid transparent;
        transition:
            background 0.3s ease,
            border-color 0.3s ease,
            backdrop-filter 0.3s ease;
    }

    .header.scrolled {
        background: rgba(5, 5, 5, 0.88);
        border-bottom-color: var(--color-border);
        backdrop-filter: blur(16px) saturate(1.2);
        -webkit-backdrop-filter: blur(16px) saturate(1.2);
    }

    .logo {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
        font-weight: 700;
        color: var(--color-text);
        text-decoration: none;
        letter-spacing: -0.02em;
    }

    .logo:hover {
        color: var(--color-text);
    }
    .logo-text {
        letter-spacing: 0.04em;
    }

    .nav {
        display: flex;
        align-items: center;
        gap: var(--space-6);
    }

    .nav-link {
        font-family: var(--font-mono);
        font-size: var(--font-size-xs);
        color: var(--color-text-dim);
        text-decoration: none;
        transition: color 0.15s ease;
        letter-spacing: 0.02em;
    }

    .nav-link:hover {
        color: var(--color-text);
    }

    .nav-cta {
        display: inline-flex;
        align-items: center;
        height: 32px;
        padding: 0 14px;
        background: var(--color-text);
        color: var(--color-bg);
        font-family: var(--font-mono);
        font-size: var(--font-size-xs);
        font-weight: 600;
        border-radius: var(--radius-md);
        text-decoration: none;
        transition: opacity 0.15s ease;
        letter-spacing: 0.02em;
    }

    .nav-cta:hover {
        opacity: 0.85;
        color: var(--color-bg);
    }

    .nav-cta-mobile {
        display: none;
        align-items: center;
        height: 30px;
        padding: 0 12px;
        background: var(--color-text);
        color: var(--color-bg);
        font-family: var(--font-mono);
        font-size: var(--font-size-xs);
        font-weight: 600;
        border-radius: var(--radius-md);
        text-decoration: none;
    }

    /* ═══════════════════════════════════════════
     STATUS BAR
  ═══════════════════════════════════════════ */
    .statusbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px var(--space-8);
        background: var(--color-bg-2);
        border-bottom: 1px solid var(--color-border);
        font-family: var(--font-mono);
        font-size: var(--font-size-2xs);
        color: var(--color-text-dim);
        letter-spacing: 0.03em;
    }

    .dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        flex-shrink: 0;
    }
    .dot-online {
        background: var(--color-success);
        box-shadow: 0 0 6px var(--color-success);
    }
    .dot-warn {
        background: var(--color-warning);
    }
    .dot-error {
        background: var(--color-danger);
    }
    .dot-pulse {
        background: var(--color-warning);
        animation: pulse 1.4s ease-in-out infinite;
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.25;
        }
    }

    .status-text {
        color: var(--s);
        font-weight: 600;
    }
    .sep {
        color: var(--color-border-hover);
    }
    .muted {
        color: var(--color-text-muted);
    }

    .chip {
        display: inline-flex;
        align-items: center;
        padding: 0 5px;
        height: 14px;
        border-radius: 2px;
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

    /* ═══════════════════════════════════════════
     HERO
  ═══════════════════════════════════════════ */
    .hero {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0;
        align-items: center;
        min-height: calc(100svh - 80px);
        padding: 64px var(--space-8) 80px;
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
        position: relative;
    }

    .hero-left {
        display: flex;
        flex-direction: column;
        gap: 28px;
        padding-right: 48px;
        z-index: 1;
    }

    /* Badge */
    .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 5px 12px;
        background: var(--color-bg-2);
        border: 1px solid var(--color-border-2);
        border-radius: var(--radius-full);
        font-family: var(--font-mono);
        font-size: var(--font-size-2xs);
        color: var(--color-text-dim);
        letter-spacing: 0.04em;
        width: fit-content;
    }

    .badge-dot {
        width: 6px;
        height: 6px;
        background: var(--color-success);
        border-radius: 50%;
        box-shadow: 0 0 6px var(--color-success);
        animation: pulse 2s ease-in-out infinite;
    }

    /* Title */
    .hero-title {
        font-family: var(--font-mono);
        font-size: clamp(38px, 5vw, 64px);
        font-weight: 700;
        line-height: 1.06;
        color: var(--color-text);
        letter-spacing: -0.03em;
        margin: 0;
    }

    .accent {
        color: var(--color-success);
        position: relative;
    }

    /* Subtitle */
    .hero-sub {
        font-family: var(--font-mono);
        font-size: 14px;
        color: var(--color-text-dim);
        line-height: 1.8;
        margin: 0;
        max-width: 440px;
    }

    /* CTA buttons */
    .hero-cta {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }

    .btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        height: 44px;
        padding: 0 22px;
        background: var(--color-text);
        color: var(--color-bg);
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
        font-weight: 600;
        border-radius: var(--radius-md);
        text-decoration: none;
        transition:
            opacity 0.15s ease,
            transform 0.15s ease;
        white-space: nowrap;
        letter-spacing: 0.01em;
    }
    .btn-primary:hover {
        opacity: 0.88;
        transform: translateY(-1px);
        color: var(--color-bg);
    }
    .btn-primary.btn-lg {
        height: 48px;
        padding: 0 26px;
    }

    .btn-ghost {
        display: inline-flex;
        align-items: center;
        height: 44px;
        padding: 0 18px;
        color: var(--color-text-dim);
        font-family: var(--font-mono);
        font-size: var(--font-size-sm);
        text-decoration: none;
        border: 1px solid var(--color-border-2);
        border-radius: var(--radius-md);
        transition:
            color 0.15s ease,
            border-color 0.15s ease,
            transform 0.15s ease;
        white-space: nowrap;
    }
    .btn-ghost:hover {
        color: var(--color-text);
        border-color: var(--color-border-hover);
        transform: translateY(-1px);
    }
    .btn-ghost.btn-lg {
        height: 48px;
        padding: 0 22px;
    }

    /* Social proof row */
    .hero-proof {
        display: flex;
        align-items: stretch;
        gap: 0;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        overflow: hidden;
        width: fit-content;
    }

    .proof-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 12px 22px;
        border-right: 1px solid var(--color-border);
    }
    .proof-item:last-child {
        border-right: none;
    }

    .proof-stat {
        font-family: var(--font-mono);
        font-size: var(--font-size-lg);
        font-weight: 700;
        color: var(--color-text);
        letter-spacing: -0.02em;
        line-height: 1;
    }

    .proof-label {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--color-text-muted);
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    /* ── 3D Canvas ─────────────────────────────────────── */
    .hero-canvas-wrap {
        position: relative;
        width: 100%;
        height: 540px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .hero-canvas {
        width: 100%;
        height: 100%;
        opacity: 0;
        transition: opacity 1.2s ease;
        display: block;
    }

    .hero-canvas.loaded {
        opacity: 1;
    }

    .canvas-glow {
        position: absolute;
        inset: 20%;
        background: radial-gradient(
            ellipse at center,
            rgba(0, 204, 102, 0.08) 0%,
            transparent 70%
        );
        pointer-events: none;
        border-radius: 50%;
        animation: glow-breathe 4s ease-in-out infinite;
    }

    @keyframes glow-breathe {
        0%,
        100% {
            opacity: 0.6;
            transform: scale(1);
        }
        50% {
            opacity: 1;
            transform: scale(1.08);
        }
    }

    /* Static fallback */
    .canvas-fallback {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
    }

    .fallback-ico {
        font-family: var(--font-mono);
        font-size: 120px;
        color: var(--color-success);
        opacity: 0.15;
        animation: spin-slow 20s linear infinite;
        line-height: 1;
    }

    @keyframes spin-slow {
        to {
            transform: rotate(360deg);
        }
    }

    /* Floating info cards */
    .float-card {
        position: absolute;
        background: rgba(12, 12, 12, 0.9);
        border: 1px solid var(--color-border-2);
        border-radius: var(--radius-lg);
        backdrop-filter: blur(12px);
        font-family: var(--font-mono);
        pointer-events: none;
        z-index: 2;
    }

    .float-card-1 {
        bottom: 18%;
        left: -4%;
        padding: 10px 14px;
        display: flex;
        align-items: center;
        gap: 9px;
    }

    .float-card-dot {
        width: 7px;
        height: 7px;
        background: var(--color-success);
        border-radius: 50%;
        box-shadow: 0 0 8px var(--color-success);
        flex-shrink: 0;
        animation: pulse 2s ease-in-out infinite;
    }

    .float-card-text {
        font-size: 11px;
        font-weight: 600;
        color: var(--color-text);
        letter-spacing: 0.02em;
    }

    .float-card-sub {
        font-size: 10px;
        color: var(--color-text-muted);
    }

    .float-card-2 {
        top: 18%;
        right: -4%;
        padding: 10px 16px;
        text-align: right;
    }

    .float-card-label {
        font-size: 10px;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 2px;
    }

    .float-card-value {
        font-size: 22px;
        font-weight: 700;
        color: var(--color-success);
        letter-spacing: -0.03em;
        line-height: 1;
    }

    .float-card-value span {
        font-size: 12px;
        color: var(--color-text-dim);
        margin-left: 2px;
        font-weight: 400;
    }

    /* ═══════════════════════════════════════════
     CODE DEMO SECTION
  ═══════════════════════════════════════════ */
    .demo-section {
        padding: 80px var(--space-8);
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
        border-top: 1px solid var(--color-border);
    }

    .demo-label {
        font-family: var(--font-mono);
        font-size: var(--font-size-2xs);
        color: var(--color-success);
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-bottom: 40px;
    }

    .demo-grid {
        display: grid;
        grid-template-columns: 1fr 1.3fr;
        gap: 56px;
        align-items: center;
    }

    .demo-title {
        font-family: var(--font-mono);
        font-size: clamp(24px, 3vw, 38px);
        font-weight: 700;
        color: var(--color-text);
        letter-spacing: -0.025em;
        margin: 0 0 16px;
        line-height: 1.15;
    }

    .demo-desc {
        font-family: var(--font-mono);
        font-size: 13px;
        color: var(--color-text-dim);
        line-height: 1.8;
        margin: 0 0 20px;
    }

    .demo-desc code {
        font-family: var(--font-mono);
        font-size: 12px;
        background: var(--color-bg-3);
        border: 1px solid var(--color-border-2);
        padding: 1px 5px;
        border-radius: var(--radius-sm);
        color: var(--color-success);
    }

    .demo-chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .chip-tag {
        font-family: var(--font-mono);
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        padding: 3px 9px;
        background: var(--color-bg-3);
        border: 1px solid var(--color-border-2);
        border-radius: var(--radius-sm);
        color: var(--color-text-dim);
    }

    /* Code block */
    .demo-code {
        background: var(--color-bg-2);
        border: 1px solid var(--color-border-2);
        border-radius: var(--radius-lg);
        overflow: hidden;
    }

    .code-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        background: var(--color-bg);
        border-bottom: 1px solid var(--color-border);
    }

    .code-dots {
        display: flex;
        gap: 5px;
    }
    .code-dots span {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: var(--color-border-2);
    }

    .code-filename {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--color-text-dim);
        flex: 1;
    }

    .code-lang-tag {
        font-family: var(--font-mono);
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--color-text-ghost);
        background: var(--color-bg-3);
        border: 1px solid var(--color-border);
        padding: 1px 7px;
        border-radius: 3px;
    }

    .code-body {
        margin: 0;
        padding: 20px 20px;
        font-family: var(--font-mono);
        font-size: 11.5px;
        line-height: 1.75;
        color: var(--color-text-dim);
        overflow-x: auto;
        white-space: pre;
        background: transparent;
        -webkit-font-smoothing: antialiased;
    }

    .code-body code {
        background: none;
        padding: 0;
    }

    /* Syntax tokens */
    .c-kw {
        color: var(--color-success);
    }
    .c-fn {
        color: var(--color-text);
    }
    .c-str {
        color: #d4a854;
    }
    .c-prop {
        color: var(--color-text-dim);
    }
    .c-dim {
        color: var(--color-text-muted);
        opacity: 0.7;
    }
    .c-brace {
        color: var(--color-text-muted);
    }
    .c-num {
        color: #d4a854;
    }
    .c-comment {
        color: var(--color-text-ghost);
        font-style: italic;
    }
    .c-success {
        color: var(--color-success);
        opacity: 0.72;
    }

    /* ═══════════════════════════════════════════
     SHARED SECTION HEADERS
  ═══════════════════════════════════════════ */
    .section-eyebrow {
        font-family: var(--font-mono);
        font-size: 10px;
        font-weight: 700;
        color: var(--color-success);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        margin-bottom: 12px;
    }

    .section-title {
        font-family: var(--font-mono);
        font-size: clamp(24px, 3.5vw, 40px);
        font-weight: 700;
        color: var(--color-text);
        letter-spacing: -0.025em;
        margin: 0 0 48px;
        line-height: 1.1;
    }

    /* ═══════════════════════════════════════════
     FEATURES
  ═══════════════════════════════════════════ */
    .features-section {
        padding: 80px var(--space-8);
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
        border-top: 1px solid var(--color-border);
    }

    .features-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--space-3);
    }

    .feat-card {
        position: relative;
        padding: 24px 22px;
        background: var(--color-bg-2);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        transition:
            border-color 0.2s ease,
            transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
            background 0.2s ease;
        overflow: hidden;
        cursor: default;
    }

    .feat-card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(
            90deg,
            transparent,
            rgba(0, 204, 102, 0.4),
            transparent
        );
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    .feat-card:hover {
        border-color: var(--color-border-2);
        transform: translateY(-3px);
        background: var(--color-bg-3);
    }

    .feat-card:hover::before {
        opacity: 1;
    }

    .feat-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
    }

    .feat-icon {
        font-family: var(--font-mono);
        font-size: 20px;
        color: var(--color-success);
        opacity: 0.7;
        line-height: 1;
    }

    .feat-tag {
        font-family: var(--font-mono);
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--color-text-ghost);
        background: var(--color-bg-3);
        border: 1px solid var(--color-border);
        padding: 2px 6px;
        border-radius: 2px;
    }

    .feat-title {
        font-family: var(--font-mono);
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text);
        margin: 0 0 10px;
        letter-spacing: -0.01em;
    }

    .feat-desc {
        font-family: var(--font-mono);
        font-size: 11.5px;
        color: var(--color-text-muted);
        line-height: 1.7;
        margin: 0 0 16px;
    }

    .feat-line {
        height: 1px;
        background: linear-gradient(90deg, var(--color-success), transparent);
        opacity: 0.2;
        margin-top: auto;
    }

    /* ═══════════════════════════════════════════
     STEPS
  ═══════════════════════════════════════════ */
    .steps-section {
        padding: 80px var(--space-8);
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
        border-top: 1px solid var(--color-border);
    }

    .steps-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--space-3);
        position: relative;
    }

    .step-card {
        position: relative;
        padding: 28px 26px;
        background: var(--color-bg-2);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        transition:
            border-color 0.2s ease,
            transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .step-card:hover {
        border-color: var(--color-border-2);
        transform: translateY(-2px);
    }

    .step-num {
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 700;
        color: var(--color-success);
        letter-spacing: 0.06em;
        margin-bottom: 16px;
        opacity: 0.8;
    }

    .step-title {
        font-family: var(--font-mono);
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text);
        margin: 0 0 10px;
        letter-spacing: -0.01em;
    }

    .step-desc {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--color-text-muted);
        line-height: 1.75;
        margin: 0 0 18px;
    }

    .step-cmd {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 7px 12px;
        background: var(--color-bg);
        border: 1px solid var(--color-border-2);
        border-radius: var(--radius-md);
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--color-text-dim);
    }

    .term-prompt {
        color: var(--color-success);
        font-weight: 700;
    }

    .step-connector {
        position: absolute;
        right: -18px;
        top: 50%;
        transform: translateY(-50%);
        font-family: var(--font-mono);
        font-size: 16px;
        color: var(--color-border-hover);
        z-index: 1;
        pointer-events: none;
    }

    /* ═══════════════════════════════════════════
     CTA SECTION
  ═══════════════════════════════════════════ */
    .cta-section {
        padding: 100px var(--space-8);
        border-top: 1px solid var(--color-border);
        position: relative;
        overflow: hidden;
    }

    .cta-glow {
        position: absolute;
        top: -60px;
        left: 50%;
        transform: translateX(-50%);
        width: 600px;
        height: 300px;
        background: radial-gradient(
            ellipse at center top,
            rgba(0, 204, 102, 0.07) 0%,
            transparent 65%
        );
        pointer-events: none;
    }

    .cta-inner {
        max-width: 560px;
        margin: 0 auto;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        position: relative;
    }

    .cta-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 5px 12px;
        background: var(--color-bg-2);
        border: 1px solid var(--color-border-2);
        border-radius: var(--radius-full);
        font-family: var(--font-mono);
        font-size: var(--font-size-2xs);
        color: var(--color-text-dim);
        letter-spacing: 0.04em;
    }

    .cta-title {
        font-family: var(--font-mono);
        font-size: clamp(28px, 4vw, 46px);
        font-weight: 700;
        color: var(--color-text);
        letter-spacing: -0.03em;
        margin: 0;
        line-height: 1.1;
    }

    .cta-sub {
        font-family: var(--font-mono);
        font-size: 13px;
        color: var(--color-text-dim);
        line-height: 1.75;
        margin: 0;
        max-width: 420px;
    }

    .cta-btns {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: center;
    }

    .cta-term {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: var(--color-bg-2);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--color-text-dim);
        margin-top: 4px;
    }

    .term-cmd {
        letter-spacing: 0.02em;
    }

    .term-cursor {
        display: inline-block;
        width: 7px;
        height: 13px;
        background: var(--color-success);
        opacity: 0.6;
        border-radius: 1px;
        animation: blink 1s step-end infinite;
        vertical-align: middle;
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

    /* ═══════════════════════════════════════════
     FOOTER
  ═══════════════════════════════════════════ */
    .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px var(--space-8);
        border-top: 1px solid var(--color-border);
        font-family: var(--font-mono);
        font-size: var(--font-size-2xs);
        color: var(--color-text-ghost);
        letter-spacing: 0.03em;
    }

    .footer-links {
        display: flex;
        gap: var(--space-5);
    }

    .footer a {
        color: var(--color-text-ghost);
        text-decoration: none;
        transition: color 0.15s ease;
    }

    .footer a:hover {
        color: var(--color-text-muted);
    }

    /* ═══════════════════════════════════════════
     RESPONSIVE
  ═══════════════════════════════════════════ */
    @media (max-width: 1024px) {
        .features-grid {
            grid-template-columns: repeat(2, 1fr);
        }
        .demo-grid {
            grid-template-columns: 1fr;
            gap: 36px;
        }
    }

    @media (max-width: 900px) {
        .header {
            padding: 12px var(--space-5);
        }

        .hero {
            grid-template-columns: 1fr;
            min-height: auto;
            padding: 56px var(--space-5) 64px;
            gap: 48px;
        }

        .hero-left {
            padding-right: 0;
        }
        .hero-canvas-wrap {
            height: 340px;
        }

        .demo-section,
        .features-section,
        .steps-section {
            padding: 64px var(--space-5);
        }

        .cta-section {
            padding: 80px var(--space-5);
        }

        .steps-grid {
            grid-template-columns: 1fr;
            gap: var(--space-4);
        }
        .step-connector {
            display: none;
        }
        .float-card {
            display: none;
        }
    }

    @media (max-width: 640px) {
        .header {
            padding: 10px var(--space-4);
        }
        .nav {
            gap: var(--space-4);
        }
        .nav-link {
            display: none;
        }
        .nav-cta {
            display: none;
        }
        .nav-cta-mobile {
            display: inline-flex;
        }

        .statusbar {
            padding: 6px var(--space-4);
            overflow-x: auto;
            white-space: nowrap;
        }

        .hero {
            padding: 40px var(--space-4) 56px;
            gap: 36px;
        }

        .hero-canvas-wrap {
            height: 260px;
        }

        .hero-proof {
            flex-direction: column;
            border-radius: var(--radius-lg);
            width: 100%;
        }

        .proof-item {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            border-right: none;
            border-bottom: 1px solid var(--color-border);
            padding: 10px 16px;
        }
        .proof-item:last-child {
            border-bottom: none;
        }

        .hero-cta {
            flex-direction: column;
            width: 100%;
        }
        .btn-primary,
        .btn-ghost {
            width: 100%;
            justify-content: center;
        }

        .demo-section,
        .features-section,
        .steps-section {
            padding: 48px var(--space-4);
        }

        .features-grid {
            grid-template-columns: 1fr;
        }

        .cta-section {
            padding: 64px var(--space-4);
        }
        .cta-btns {
            flex-direction: column;
            width: 100%;
        }
        .cta-btns .btn-primary,
        .cta-btns .btn-ghost {
            width: 100%;
            justify-content: center;
        }

        .footer {
            padding: 14px var(--space-4);
            font-size: 10px;
        }
    }

    /* ─── Reduced motion ────────────────────────── */
    @media (prefers-reduced-motion: reduce) {
        :global(.reveal) {
            opacity: 1;
            transform: none;
            transition: none;
        }
        .dot-pulse,
        .badge-dot,
        .canvas-glow,
        .fallback-ico,
        .term-cursor {
            animation: none;
        }
        .btn-primary:hover,
        .btn-ghost:hover,
        .feat-card:hover,
        .step-card:hover {
            transform: none;
        }
    }
</style>
