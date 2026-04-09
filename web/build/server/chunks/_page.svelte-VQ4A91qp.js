import { p as head, q as attr_style, h as stringify, f as attr_class, j as escape_html, k as derived } from './renderer-DMNwzsJT.js';

/* empty css                                                */
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let status = "checking";
    const statusConfig = {
      checking: {
        label: "Connecting…",
        dot: "dot-pulse",
        color: "var(--color-warning)"
      },
      connected: {
        label: "All systems operational",
        dot: "dot-online",
        color: "var(--color-success)"
      },
      degraded: {
        label: "Degraded",
        dot: "dot-degraded",
        color: "var(--color-warning)"
      },
      error: {
        label: "Backend unreachable",
        dot: "dot-error",
        color: "var(--color-danger)"
      }
    };
    let cfg = derived(() => statusConfig[status]);
    head("1uha8ag", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Kyro — API Management Platform</title>`);
      });
    });
    $$renderer2.push(`<div class="landing svelte-1uha8ag"><header class="header svelte-1uha8ag"><a href="/" class="logo svelte-1uha8ag"><span class="logo-mark svelte-1uha8ag">K</span> <span class="logo-text svelte-1uha8ag">Kyro</span></a> <nav class="nav svelte-1uha8ag"><a href="/health" class="nav-link svelte-1uha8ag">Status</a> <a href="/login" class="nav-link svelte-1uha8ag">Sign In</a> <a href="/register" class="nav-btn svelte-1uha8ag">Get Started</a></nav></header> <div class="status-bar svelte-1uha8ag"${attr_style(`--status-color: ${stringify(cfg().color)}`)}><span${attr_class(`dot ${stringify(cfg().dot)}`, "svelte-1uha8ag")}></span> <span class="status-label svelte-1uha8ag">${escape_html(cfg().label)}</span> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <main class="hero svelte-1uha8ag"><div class="hero-inner svelte-1uha8ag"><div class="eyebrow svelte-1uha8ag">API Management Platform</div> <h1 class="hero-title svelte-1uha8ag">Build faster.<br class="svelte-1uha8ag"/> Ship with <span class="accent svelte-1uha8ag">confidence.</span></h1> <p class="hero-sub svelte-1uha8ag">Manage API keys, track usage in real time, and store files —
				all in one unified platform built for modern teams.</p> <div class="hero-cta svelte-1uha8ag"><a href="/register" class="cta-primary svelte-1uha8ag">Start Building Free</a> <a href="/login" class="cta-secondary svelte-1uha8ag">Sign In →</a></div></div> <div class="features svelte-1uha8ag"><div class="feature-card svelte-1uha8ag"><div class="feature-icon svelte-1uha8ag">🔑</div> <h3 class="svelte-1uha8ag">API Key Management</h3> <p class="svelte-1uha8ag">Create, scope, and revoke keys with fine-grained permission control.</p></div> <div class="feature-card svelte-1uha8ag"><div class="feature-icon svelte-1uha8ag">📊</div> <h3 class="svelte-1uha8ag">Usage Analytics</h3> <p class="svelte-1uha8ag">Real-time dashboards with daily breakdowns and bandwidth tracking.</p></div> <div class="feature-card svelte-1uha8ag"><div class="feature-icon svelte-1uha8ag">📁</div> <h3 class="svelte-1uha8ag">File Storage</h3> <p class="svelte-1uha8ag">Upload, serve, and manage files with per-org storage quotas.</p></div> <div class="feature-card svelte-1uha8ag"><div class="feature-icon svelte-1uha8ag">🛡️</div> <h3 class="svelte-1uha8ag">Rate Limiting</h3> <p class="svelte-1uha8ag">Redis-backed rate limiting protects your infrastructure automatically.</p></div></div></main> <footer class="footer svelte-1uha8ag"><span class="svelte-1uha8ag">© 2026 Kyro</span> <a href="/health" class="svelte-1uha8ag">System Status</a></footer></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-VQ4A91qp.js.map
