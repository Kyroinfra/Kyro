import { aj as head } from './renderer-DLnxqfrv.js';
import { B as Button } from './Button-Dk7lPlAr.js';
import { C as Card } from './Card-DiwOWxdT.js';

function _page($$renderer) {
  head("1uha8ag", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>Kyro - API Management Platform</title>`);
    });
  });
  $$renderer.push(`<div class="landing svelte-1uha8ag"><header class="header svelte-1uha8ag"><div class="logo svelte-1uha8ag"><span class="logo-icon svelte-1uha8ag">K</span> <span class="logo-text">Kyro</span></div> <nav class="nav svelte-1uha8ag"><a href="/login" class="nav-link svelte-1uha8ag">Sign In</a> `);
  Button($$renderer, {
    onclick: () => window.location.href = "/register",
    children: ($$renderer2) => {
      $$renderer2.push(`<!---->Get Started`);
    }
  });
  $$renderer.push(`<!----></nav></header> <main class="svelte-1uha8ag"><section class="hero svelte-1uha8ag"><h1 class="hero-title svelte-1uha8ag">Build faster with Kyro</h1> <p class="hero-subtitle svelte-1uha8ag">The modern API management platform for developers. Manage keys, track usage, and scale with confidence.</p> <div class="hero-cta svelte-1uha8ag">`);
  Button($$renderer, {
    size: "lg",
    onclick: () => window.location.href = "/register",
    children: ($$renderer2) => {
      $$renderer2.push(`<!---->Start Building Free`);
    }
  });
  $$renderer.push(`<!----> `);
  Button($$renderer, {
    variant: "secondary",
    size: "lg",
    onclick: () => window.location.href = "/login",
    children: ($$renderer2) => {
      $$renderer2.push(`<!---->Sign In`);
    }
  });
  $$renderer.push(`<!----></div></section> <section class="features svelte-1uha8ag">`);
  Card($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="feature svelte-1uha8ag"><div class="feature-icon svelte-1uha8ag">🔑</div> <h3 class="svelte-1uha8ag">API Key Management</h3> <p class="svelte-1uha8ag">Create, manage, and revoke API keys with fine-grained permissions and scopes.</p></div>`);
    }
  });
  $$renderer.push(`<!----> `);
  Card($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="feature svelte-1uha8ag"><div class="feature-icon svelte-1uha8ag">📊</div> <h3 class="svelte-1uha8ag">Usage Analytics</h3> <p class="svelte-1uha8ag">Track API usage in real-time with detailed analytics and daily breakdowns.</p></div>`);
    }
  });
  $$renderer.push(`<!----> `);
  Card($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="feature svelte-1uha8ag"><div class="feature-icon svelte-1uha8ag">📁</div> <h3 class="svelte-1uha8ag">File Storage</h3> <p class="svelte-1uha8ag">Upload and serve files with built-in storage management and quotas.</p></div>`);
    }
  });
  $$renderer.push(`<!----></section></main> <footer class="footer svelte-1uha8ag"><p>© 2026 Kyro. All rights reserved.</p></footer></div>`);
}

export { _page as default };
//# sourceMappingURL=_page.svelte-EtqtfLkE.js.map
