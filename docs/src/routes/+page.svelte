<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import Logo from "$lib/components/Logo.svelte";

    let canvasEl: HTMLCanvasElement | undefined = $state();
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

            let mx = 0, my = 0, tmx = 0, tmy = 0;
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

                tmx += (mx - tmx) * 0.1;
                tmy += (my - tmy) * 0.1;

                ico.rotation.x = t * 0.18 + tmy * 0.5;
                ico.rotation.y = t * 0.26 + tmx * 0.5;
                inner.rotation.copy(ico.rotation);

                ring.rotation.y = t * 0.08;
                ring2.rotation.z = t * 0.05 + Math.PI / 6;

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
        const onScroll = () => { scrolled = window.scrollY > 20; };
        window.addEventListener("scroll", onScroll, { passive: true });

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
        document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

        loadThree();

        return () => {
            window.removeEventListener("scroll", onScroll);
            observer.disconnect();
        };
    });

    onDestroy(() => { threeCleanup?.(); });

    const features = [
        {
            icon: "◇",
            tag: "RAG",
            title: "Ask Your Documents",
            desc: "Ask a question, get a grounded answer with inline citations. The LLM only sees what's in your files — no hallucination, no guessing.",
        },
        {
            icon: "↑",
            tag: "SEARCH",
            title: "Hybrid Semantic Search",
            desc: "BM25 keyword search fused with pgvector similarity via RRF. Finds the right chunk even when the query doesn't share exact words with the source.",
        },
        {
            icon: "▤",
            tag: "INFRA",
            title: "Fully Self-Hosted",
            desc: "One docker compose up. Postgres, Redis, Ollama, and Kyro on your own server. Your documents never leave your network.",
        },
        {
            icon: "⊙",
            tag: "PLATFORM",
            title: "API-First & Multi-tenant",
            desc: "Scoped API keys, role-based access, webhooks, collections. Embed it in your own product or wire it up to an internal tool in an afternoon.",
        },
    ];

    const steps = [
        {
            n: "01",
            title: "Deploy in one command",
            desc: "Postgres, Redis, Ollama, and Kyro running locally. No cloud accounts, no API keys, no dependencies outside your machine.",
            cmd: "docker compose up -d",
        },
        {
            n: "02",
            title: "Upload your documents",
            desc: "PDFs, DOCX, plain text. Text extraction and vector embedding run automatically in the background via BullMQ workers.",
            cmd: "POST /api/v2/files",
        },
        {
            n: "03",
            title: "Ask questions via API",
            desc: "Send a question. Get a streamed, cited answer grounded in your documents. Wire it to a chatbot, a search UI, or a CLI.",
            cmd: "POST /api/v2/files/ask",
        },
    ];

    const audiences = [
        { icon: "⚖", label: "Legal teams", desc: "Contract review, clause extraction, matter research — without sending client files to OpenAI." },
        { icon: "⊞", label: "Research teams", desc: "Query across hundreds of papers. Find the passage you half-remember without re-reading everything." },
        { icon: "◎", label: "Support teams", desc: "Ground your support bot in your actual product docs. No hallucinated feature names." },
        { icon: "⌥", label: "Developers", desc: "Embed a fully-featured RAG API into your product. No ML infra to manage." },
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
        content="Upload documents, ask questions in plain English. Everything runs on your own server. Your data never leaves your network."
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
            <a href="https://github.com/Kyroinfra/Kyro" class="nav-cta" target="_blank" rel="noopener noreferrer">github →</a>
        </nav>
    </header>

    <!-- ══════════════════════ TAGLINE BAR ══════════════════════ -->
    <div class="tagbar" role="banner">
        <span class="tagbar-item">
            <span class="tagbar-dot" aria-hidden="true"></span>
            Self-hosted
        </span>
        <span class="tagbar-sep" aria-hidden="true">·</span>
        <span class="tagbar-item">MIT licensed</span>
        <span class="tagbar-sep" aria-hidden="true">·</span>
        <span class="tagbar-item">Open source</span>
        <span class="tagbar-sep" aria-hidden="true">·</span>
        <span class="tagbar-item tagbar-muted">No vendor lock-in. No data egress. Ever.</span>
    </div>

    <main>
        <!-- ══════════════════════ HERO ══════════════════════ -->
        <section class="hero" aria-label="Hero">
            <div class="hero-left">
                <div class="hero-badge reveal">
                    <span class="badge-dot" aria-hidden="true"></span>
                    <span>Self-hosted RAG · Runs on your infra</span>
                </div>

                <h1 class="hero-title reveal">
                    RAG without<br />the data <span class="accent">leak.</span>
                </h1>

                <p class="hero-sub reveal">
                    Upload documents, ask questions in plain English, get cited answers —
                    all on your own server. OpenAI never sees a byte.
                </p>

 <div class="hero-cta reveal">
                    <a href="/docs" class="btn-primary">
                        <span>Read the docs</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </a>
                    <a href="https://github.com/Kyroinfra/Kyro" class="btn-ghost" target="_blank" rel="noopener noreferrer">view on github</a>
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

            <!-- 3D Canvas — desktop only -->
            <div class="hero-canvas-wrap" aria-hidden="true">
                {#if canvasVisible}
                    <canvas
                        bind:this={canvasEl}
                        class="hero-canvas"
                        class:loaded={threeLoaded}
                    ></canvas>
                    <div class="canvas-glow"></div>
                {:else}
                    <div class="canvas-fallback">
                        <div class="fallback-ico">◇</div>
                    </div>
                {/if}

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

            <!-- Mobile-only stats strip (shown instead of canvas on small screens) -->
            <div class="hero-mobile-stats reveal" aria-label="Platform highlights">
                <div class="mobile-stat">
                    <span class="mobile-stat-icon">◇</span>
                    <span class="mobile-stat-text">Vector + BM25 hybrid search</span>
                </div>
                <div class="mobile-stat">
                    <span class="mobile-stat-icon">▤</span>
                    <span class="mobile-stat-text">Runs entirely on your server</span>
                </div>
                <div class="mobile-stat">
                    <span class="mobile-stat-icon">⊙</span>
                    <span class="mobile-stat-text">PDF, DOCX, TXT supported</span>
                </div>
            </div>
        </section>

        <!-- ══════════════════════ WHO IS THIS FOR ══════════════════════ -->
        <section class="audience-section" aria-labelledby="audience-heading">
            <div class="section-eyebrow reveal">built for</div>
            <h2 id="audience-heading" class="section-title reveal">
                Teams that can't send<br class="title-br" />client data to OpenAI.
            </h2>
            <div class="audience-grid">
                {#each audiences as aud, i}
                    <div class="aud-card reveal" style="--delay: {i * 60}ms">
                        <span class="aud-icon" aria-hidden="true">{aud.icon}</span>
                        <div class="aud-body">
                            <h3 class="aud-label">{aud.label}</h3>
                            <p class="aud-desc">{aud.desc}</p>
                        </div>
                    </div>
                {/each}
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
                        The <code>/ask</code> endpoint accepts a question and optional
                        file IDs. It retrieves the most relevant chunks via hybrid search,
                        builds a grounded prompt, and streams back an answer with source
                        citations — entirely on your own server.
                    </p>
                    <div class="demo-chips">
                        <span class="chip-tag">streaming SSE</span>
                        <span class="chip-tag">source citations</span>
                        <span class="chip-tag">local LLM</span>
                        <span class="chip-tag">metadata filters</span>
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
><span class="c-comment">// Ask a question across your documents</span>
<span class="c-kw">const</span> stream <span class="c-dim">=</span> <span class="c-kw">await</span> <span class="c-fn">fetch</span><span class="c-brace">(</span><span class="c-str">"/api/v2/files/ask"</span><span class="c-dim">,</span> <span class="c-brace">{"{"}  </span>
  method<span class="c-dim">:</span>  <span class="c-str">"POST"</span><span class="c-dim">,</span>
  headers<span class="c-dim">:</span> <span class="c-brace">{"{"}</span> <span class="c-str">"X-API-Key"</span><span class="c-dim">:</span> process<span class="c-dim">.</span>env<span class="c-dim">.</span><span class="c-prop">KYRO_KEY</span> <span class="c-brace">{"}"}</span><span class="c-dim">,</span>
  body<span class="c-dim">:</span> <span class="c-prop">JSON</span><span class="c-dim">.</span><span class="c-fn">stringify</span><span class="c-brace">({"{"}</span>
    question<span class="c-dim">:</span> <span class="c-str">"What are the payment terms?"</span><span class="c-dim">,</span>
    fileIds<span class="c-dim">:</span>  <span class="c-brace">[</span><span class="c-str">"uuid-1"</span><span class="c-dim">,</span> <span class="c-str">"uuid-2"</span><span class="c-brace">],</span>
    topK<span class="c-dim">:</span>     <span class="c-num">8</span><span class="c-dim">,</span>
  <span class="c-brace">{"}"}</span>)<span class="c-dim">,</span>
<span class="c-brace">{"}"}</span>)<span class="c-dim">;</span>

<span class="c-comment">// Response streams SSE events:</span>
<span class="c-success">// {"{"} type: "sources",  sources: [{"{"} fileId, score, content {"}"}] {"}"}</span>
<span class="c-success">// {"{"} type: "chunk",    text: "According to [1], payment..." {"}"}</span>
<span class="c-success">// {"{"} type: "done" {"}"}</span></code></pre>
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
                            <span class="feat-icon" aria-hidden="true">{feat.icon}</span>
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
                    <div class="step-card reveal" style="--delay: {i * 90}ms" aria-label="Step {step.n}">
                        <div class="step-num" aria-hidden="true">{step.n}</div>
                        <div class="step-content">
                            <h3 class="step-title">{step.title}</h3>
                            <p class="step-desc">{step.desc}</p>
                            <div class="step-cmd" role="code" aria-label="Command: {step.cmd}">
                                <span class="term-prompt" aria-hidden="true">$</span>
                                <span>{step.cmd}</span>
                            </div>
                        </div>
                        {#if i < steps.length - 1}
                            <div class="step-connector" aria-hidden="true"><span>→</span></div>
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
                    <span>Free to self-host · MIT licensed · always open source</span>
                </div>
                <h2 id="cta-heading" class="cta-title">
                    Your knowledge base.<br />Your rules.
                </h2>
                <p class="cta-sub">
                    No credit card. No vendor lock-in. No data egress.
                    Your documents stay on your server, forever.
                </p>
 <div class="cta-btns">
                    <a href="/docs" class="btn-primary btn-lg">
                        <span>Read the docs</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </a>
                    <a href="https://github.com/Kyroinfra/Kyro" class="btn-ghost btn-lg" target="_blank" rel="noopener noreferrer">view on github →</a>
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
        <span class="footer-copy">© 2026 kyro</span>
        <nav class="footer-links" aria-label="Footer navigation">
            <a href="/docs">docs</a>
            <a href="https://github.com/Kyroinfra/Kyro" target="_blank" rel="noopener noreferrer">github</a>
        </nav>
    </footer>
</div>

<style>
    /* ═══════════════════════════════════════════
     BASE
    ═══════════════════════════════════════════ */
    .landing {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background: var(--color-bg);
        overflow-x: hidden;
    }

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
    .logo:hover { color: var(--color-text); }
    .logo-text { letter-spacing: 0.04em; }

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
    .nav-link:hover { color: var(--color-text); }

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
    .nav-cta:hover { opacity: 0.85; color: var(--color-bg); }

    .tagbar {
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

    .tagbar-dot {
        display: inline-block;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--color-success);
        box-shadow: 0 0 6px var(--color-success);
        flex-shrink: 0;
    }

    .tagbar-item {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--color-text-dim);
        font-weight: 500;
    }

    .tagbar-sep { color: var(--color-border-hover); }

    .tagbar-muted { color: var(--color-text-muted); font-weight: 400; }

    /* ═══════════════════════════════════════════
     HERO
    ═══════════════════════════════════════════ */
    .hero {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0;
        align-items: center;
        min-height: calc(100svh - 88px);
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

    .hero-title {
        font-family: var(--font-mono);
        font-size: clamp(38px, 5vw, 64px);
        font-weight: 700;
        line-height: 1.06;
        color: var(--color-text);
        letter-spacing: -0.03em;
        margin: 0;
    }

    .accent { color: var(--color-success); }

    .hero-sub {
        font-family: var(--font-mono);
        font-size: 14px;
        color: var(--color-text-dim);
        line-height: 1.8;
        margin: 0;
        max-width: 420px;
    }

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
        transition: opacity 0.15s ease, transform 0.15s ease;
        white-space: nowrap;
        letter-spacing: 0.01em;
    }
    .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); color: var(--color-bg); }
    .btn-primary.btn-lg { height: 48px; padding: 0 26px; }

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
        transition: color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
        white-space: nowrap;
    }
    .btn-ghost:hover { color: var(--color-text); border-color: var(--color-border-hover); transform: translateY(-1px); }
    .btn-ghost.btn-lg { height: 48px; padding: 0 22px; }

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
    .proof-item:last-child { border-right: none; }

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

    /* ── 3D Canvas ── */
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
    .hero-canvas.loaded { opacity: 1; }

    .canvas-glow {
        position: absolute;
        inset: 20%;
        background: radial-gradient(ellipse at center, rgba(0, 204, 102, 0.08) 0%, transparent 70%);
        pointer-events: none;
        border-radius: 50%;
        animation: glow-breathe 4s ease-in-out infinite;
    }

    @keyframes glow-breathe {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.08); }
    }

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
    @keyframes spin-slow { to { transform: rotate(360deg); } }

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

    /* Mobile stats strip — hidden on desktop */
    .hero-mobile-stats {
        display: none;
        flex-direction: column;
        gap: var(--space-2);
        padding: var(--space-4);
        background: var(--color-bg-2);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
    }

    .mobile-stat {
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: var(--font-mono);
        font-size: var(--font-size-xs);
        color: var(--color-text-dim);
    }

    .mobile-stat-icon {
        font-size: 14px;
        color: var(--color-success);
        opacity: 0.7;
        width: 18px;
        text-align: center;
        flex-shrink: 0;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.25; }
    }

    /* ═══════════════════════════════════════════
     AUDIENCE SECTION
    ═══════════════════════════════════════════ */
    .audience-section {
        padding: 80px var(--space-8);
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
        border-top: 1px solid var(--color-border);
    }

    .audience-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--space-3);
    }

    .aud-card {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 22px 20px;
        background: var(--color-bg-2);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        transition: border-color 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        cursor: default;
    }
    .aud-card:hover {
        border-color: var(--color-border-2);
        transform: translateY(-2px);
    }

    .aud-icon {
        font-family: var(--font-mono);
        font-size: 18px;
        color: var(--color-success);
        opacity: 0.7;
        line-height: 1;
    }

    .aud-body { display: flex; flex-direction: column; gap: 6px; }

    .aud-label {
        font-family: var(--font-mono);
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text);
        margin: 0;
        letter-spacing: -0.01em;
    }

    .aud-desc {
        font-family: var(--font-mono);
        font-size: 11.5px;
        color: var(--color-text-muted);
        line-height: 1.7;
        margin: 0;
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

    .title-br { display: none; }

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

    .code-dots { display: flex; gap: 5px; }
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
        padding: 20px;
        font-family: var(--font-mono);
        font-size: 11.5px;
        line-height: 1.75;
        color: var(--color-text-dim);
        overflow-x: auto;
        white-space: pre;
        background: transparent;
    }
    .code-body code { background: none; padding: 0; }

    .c-kw   { color: var(--color-success); }
    .c-fn   { color: var(--color-text); }
    .c-str  { color: #d4a854; }
    .c-prop { color: var(--color-text-dim); }
    .c-dim  { color: var(--color-text-muted); opacity: 0.7; }
    .c-brace{ color: var(--color-text-muted); }
    .c-num  { color: #d4a854; }
    .c-comment { color: var(--color-text-ghost); font-style: italic; }
    .c-success { color: var(--color-success); opacity: 0.72; }

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
        transition: border-color 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease;
        overflow: hidden;
        cursor: default;
    }
    .feat-card::before {
        content: "";
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(0, 204, 102, 0.4), transparent);
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    .feat-card:hover { border-color: var(--color-border-2); transform: translateY(-3px); background: var(--color-bg-3); }
    .feat-card:hover::before { opacity: 1; }

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
        transition: border-color 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .step-card:hover { border-color: var(--color-border-2); transform: translateY(-2px); }

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

    .term-prompt { color: var(--color-success); font-weight: 700; }

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
        background: radial-gradient(ellipse at center top, rgba(0, 204, 102, 0.07) 0%, transparent 65%);
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
        max-width: 400px;
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

    .term-cmd { letter-spacing: 0.02em; }

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
        0%, 100% { opacity: 0.6; }
        50% { opacity: 0; }
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

    .footer-copy { color: var(--color-text-ghost); }

    .footer-links {
        display: flex;
        gap: var(--space-5);
    }

    .footer a { color: var(--color-text-ghost); text-decoration: none; transition: color 0.15s ease; }
    .footer a:hover { color: var(--color-text-muted); }

    /* ═══════════════════════════════════════════
     RESPONSIVE
    ═══════════════════════════════════════════ */
    @media (max-width: 1024px) {
        .features-grid  { grid-template-columns: repeat(2, 1fr); }
        .audience-grid  { grid-template-columns: repeat(2, 1fr); }
        .demo-grid      { grid-template-columns: 1fr; gap: 36px; }
    }

    @media (max-width: 900px) {
        .header { padding: 12px var(--space-5); }

        .hero {
            grid-template-columns: 1fr;
            min-height: auto;
            padding: 56px var(--space-5) 40px;
            gap: 36px;
        }

        /* Hide 3D canvas on tablet/mobile, show text strip instead */
        .hero-canvas-wrap { display: none; }
        .hero-mobile-stats { display: flex; }

        .hero-left { padding-right: 0; }

        .tagbar {
            padding: 6px var(--space-5);
            overflow-x: auto;
            white-space: nowrap;
        }

        .audience-section,
        .demo-section,
        .features-section,
        .steps-section { padding: 64px var(--space-5); }

        .cta-section { padding: 80px var(--space-5); }

        .steps-grid { grid-template-columns: 1fr; gap: var(--space-4); }
        .step-connector { display: none; }
        .float-card { display: none; }
    }

    @media (max-width: 640px) {
        .header { padding: 10px var(--space-4); }
        .nav { gap: var(--space-4); }
        .nav-link { display: none; }

        .tagbar {
            padding: 6px var(--space-4);
            font-size: 10px;
            gap: 6px;
        }
        .tagbar-muted { display: none; }

        .hero { padding: 40px var(--space-4) 36px; gap: 28px; }

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
        .proof-item:last-child { border-bottom: none; }

        .hero-cta { flex-direction: column; width: 100%; }
        .btn-primary, .btn-ghost { width: 100%; justify-content: center; }

        .title-br { display: inline; }

        .audience-section,
        .demo-section,
        .features-section,
        .steps-section { padding: 48px var(--space-4); }

        .audience-grid  { grid-template-columns: 1fr; }
        .features-grid  { grid-template-columns: 1fr; }

        .cta-section { padding: 64px var(--space-4); }
        .cta-btns { flex-direction: column; width: 100%; }
        .cta-btns .btn-primary,
        .cta-btns .btn-ghost { width: 100%; justify-content: center; }

        .footer { padding: 14px var(--space-4); font-size: 10px; }
        .footer-links { gap: var(--space-4); }
    }

    /* ─── Reduced motion ── */
    @media (prefers-reduced-motion: reduce) {
        :global(.reveal) { opacity: 1; transform: none; transition: none; }
        .badge-dot, .float-card-dot, .canvas-glow, .fallback-ico, .term-cursor { animation: none; }
        .btn-primary:hover, .btn-ghost:hover, .feat-card:hover, .step-card:hover, .aud-card:hover { transform: none; }
    }
</style>
