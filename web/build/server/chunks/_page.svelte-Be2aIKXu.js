import { p as head, j as escape_html, f as attr_class } from './renderer-DMNwzsJT.js';
import 'chart.js/auto';
import { C as Card } from './Card-Bm2Np101.js';
import { c as formatNumber, f as formatBytes } from './format-Dn_JvzeH.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let selectedRange = "30";
    head("fdpyiq", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Usage - Kyro</title>`);
      });
    });
    $$renderer2.push(`<div class="usage-page svelte-fdpyiq"><header class="page-header svelte-fdpyiq"><div class="header-content svelte-fdpyiq"><span class="prompt svelte-fdpyiq">$</span> <span class="command svelte-fdpyiq">./usage.sh</span></div></header> <div class="stats-grid svelte-fdpyiq">`);
    Card($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="stat-card svelte-fdpyiq"><div class="stat-info svelte-fdpyiq"><span class="stat-label svelte-fdpyiq">Total Requests</span> <span class="stat-value svelte-fdpyiq"><span class="bracket svelte-fdpyiq">[</span> ${escape_html(formatNumber(data.stats.totalRequests))} <span class="bracket svelte-fdpyiq">]</span></span></div></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="stat-card svelte-fdpyiq"><div class="stat-info svelte-fdpyiq"><span class="stat-label svelte-fdpyiq">Data In</span> <span class="stat-value svelte-fdpyiq"><span class="bracket svelte-fdpyiq">[</span> ${escape_html(formatBytes(data.stats.totalBytesIn))} <span class="bracket svelte-fdpyiq">]</span></span></div></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="stat-card svelte-fdpyiq"><div class="stat-info svelte-fdpyiq"><span class="stat-label svelte-fdpyiq">Data Out</span> <span class="stat-value svelte-fdpyiq"><span class="bracket svelte-fdpyiq">[</span> ${escape_html(formatBytes(data.stats.totalBytesOut))} <span class="bracket svelte-fdpyiq">]</span></span></div></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="stat-card svelte-fdpyiq"><div class="stat-info svelte-fdpyiq"><span class="stat-label svelte-fdpyiq">Storage</span> <span class="stat-value svelte-fdpyiq"><span class="bracket svelte-fdpyiq">[</span> ${escape_html(formatBytes(data.stats.totalStorage))} <span class="bracket svelte-fdpyiq">]</span></span></div></div>`);
      }
    });
    $$renderer2.push(`<!----></div> `);
    Card($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="chart-header svelte-fdpyiq"><span class="chart-title svelte-fdpyiq">// Request History</span> <div class="range-selector svelte-fdpyiq"><button${attr_class("range-btn svelte-fdpyiq", void 0, { "active": selectedRange === "7" })}><span class="range-marker">[</span>7d<span class="range-marker">]</span></button> <button${attr_class("range-btn svelte-fdpyiq", void 0, { "active": selectedRange === "30" })}><span class="range-marker">[</span>30d<span class="range-marker">]</span></button> <button${attr_class("range-btn svelte-fdpyiq", void 0, { "active": selectedRange === "90" })}><span class="range-marker">[</span>90d<span class="range-marker">]</span></button></div></div> <div class="chart-container svelte-fdpyiq"><canvas></canvas></div>`);
      }
    });
    $$renderer2.push(`<!----></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-Be2aIKXu.js.map
