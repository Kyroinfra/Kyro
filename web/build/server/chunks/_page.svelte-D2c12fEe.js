import { p as head, j as escape_html } from './renderer-DMNwzsJT.js';
import { C as Card } from './Card-Bm2Np101.js';
import './auth-F4mmdpWG.js';
import { f as formatNumber, a as formatBytes } from './format-qfo27skI.js';
import './index-Dw650lR_.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    head("1tyszyy", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Dashboard - Kyro</title>`);
      });
    });
    $$renderer2.push(`<div class="dashboard svelte-1tyszyy"><header class="dashboard-header svelte-1tyszyy"><div><h1 class="svelte-1tyszyy">Welcome back</h1> <p class="subtitle svelte-1tyszyy">Here's what's happening with your API</p></div></header> <div class="stats-grid svelte-1tyszyy">`);
    Card($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="stat-card svelte-1tyszyy"><span class="stat-icon svelte-1tyszyy">🔑</span> <div class="stat-info svelte-1tyszyy"><span class="stat-value svelte-1tyszyy">${escape_html(formatNumber(data.stats.activeApiKeys))}</span> <span class="stat-label svelte-1tyszyy">API Keys</span></div></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="stat-card svelte-1tyszyy"><span class="stat-icon svelte-1tyszyy">📊</span> <div class="stat-info svelte-1tyszyy"><span class="stat-value svelte-1tyszyy">${escape_html(formatNumber(data.stats.totalRequests))}</span> <span class="stat-label svelte-1tyszyy">API Requests</span></div></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="stat-card svelte-1tyszyy"><span class="stat-icon svelte-1tyszyy">📁</span> <div class="stat-info svelte-1tyszyy"><span class="stat-value svelte-1tyszyy">${escape_html(formatBytes(data.stats.totalStorage))}</span> <span class="stat-label svelte-1tyszyy">Storage Used</span></div></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="stat-card svelte-1tyszyy"><span class="stat-icon svelte-1tyszyy">👥</span> <div class="stat-info svelte-1tyszyy"><span class="stat-value svelte-1tyszyy">${escape_html(formatNumber(data.stats.totalMembers))}</span> <span class="stat-label svelte-1tyszyy">Team Members</span></div></div>`);
      }
    });
    $$renderer2.push(`<!----></div> <div class="quick-actions svelte-1tyszyy"><h2 class="svelte-1tyszyy">Quick Actions</h2> <div class="actions-grid svelte-1tyszyy"><a href="/dashboard/keys" class="action-card svelte-1tyszyy"><span class="action-icon svelte-1tyszyy">🔑</span> <span class="action-label svelte-1tyszyy">Create API Key</span></a> <a href="/dashboard/files" class="action-card svelte-1tyszyy"><span class="action-icon svelte-1tyszyy">📤</span> <span class="action-label svelte-1tyszyy">Upload File</span></a> <a href="/dashboard/usage" class="action-card svelte-1tyszyy"><span class="action-icon svelte-1tyszyy">📈</span> <span class="action-label svelte-1tyszyy">View Analytics</span></a> <a href="/dashboard/settings" class="action-card svelte-1tyszyy"><span class="action-icon svelte-1tyszyy">⚙️</span> <span class="action-label svelte-1tyszyy">Settings</span></a></div></div></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-D2c12fEe.js.map
