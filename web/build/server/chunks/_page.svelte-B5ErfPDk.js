import { aj as head } from './renderer-DLnxqfrv.js';
import { C as Card } from './Card-DiwOWxdT.js';
import './auth-DoP_VBlP.js';
import './index-nmK-lLzQ.js';

function _page($$renderer) {
  head("1tyszyy", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>Dashboard - Kyro</title>`);
    });
  });
  $$renderer.push(`<div class="dashboard svelte-1tyszyy"><header class="dashboard-header svelte-1tyszyy"><div><h1 class="svelte-1tyszyy">Welcome back</h1> <p class="subtitle svelte-1tyszyy">Here's what's happening with your API</p></div></header> <div class="stats-grid svelte-1tyszyy">`);
  Card($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="stat-card svelte-1tyszyy"><span class="stat-icon svelte-1tyszyy">🔑</span> <div class="stat-info svelte-1tyszyy"><span class="stat-value svelte-1tyszyy">0</span> <span class="stat-label svelte-1tyszyy">API Keys</span></div></div>`);
    }
  });
  $$renderer.push(`<!----> `);
  Card($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="stat-card svelte-1tyszyy"><span class="stat-icon svelte-1tyszyy">📊</span> <div class="stat-info svelte-1tyszyy"><span class="stat-value svelte-1tyszyy">0</span> <span class="stat-label svelte-1tyszyy">API Requests</span></div></div>`);
    }
  });
  $$renderer.push(`<!----> `);
  Card($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="stat-card svelte-1tyszyy"><span class="stat-icon svelte-1tyszyy">📁</span> <div class="stat-info svelte-1tyszyy"><span class="stat-value svelte-1tyszyy">0 MB</span> <span class="stat-label svelte-1tyszyy">Storage Used</span></div></div>`);
    }
  });
  $$renderer.push(`<!----> `);
  Card($$renderer, {
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="stat-card svelte-1tyszyy"><span class="stat-icon svelte-1tyszyy">👥</span> <div class="stat-info svelte-1tyszyy"><span class="stat-value svelte-1tyszyy">1</span> <span class="stat-label svelte-1tyszyy">Team Members</span></div></div>`);
    }
  });
  $$renderer.push(`<!----></div> <div class="quick-actions svelte-1tyszyy"><h2 class="svelte-1tyszyy">Quick Actions</h2> <div class="actions-grid svelte-1tyszyy"><a href="/dashboard/keys" class="action-card svelte-1tyszyy"><span class="action-icon svelte-1tyszyy">🔑</span> <span class="action-label svelte-1tyszyy">Create API Key</span></a> <a href="/dashboard/files" class="action-card svelte-1tyszyy"><span class="action-icon svelte-1tyszyy">📤</span> <span class="action-label svelte-1tyszyy">Upload File</span></a> <a href="/dashboard/usage" class="action-card svelte-1tyszyy"><span class="action-icon svelte-1tyszyy">📈</span> <span class="action-label svelte-1tyszyy">View Analytics</span></a> <a href="/dashboard/settings" class="action-card svelte-1tyszyy"><span class="action-icon svelte-1tyszyy">⚙️</span> <span class="action-label svelte-1tyszyy">Settings</span></a></div></div></div>`);
}

export { _page as default };
//# sourceMappingURL=_page.svelte-B5ErfPDk.js.map
