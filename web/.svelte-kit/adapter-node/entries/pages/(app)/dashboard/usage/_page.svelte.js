import { h as head, b as escape_html, a as attr_class } from "../../../../../chunks/renderer.js";
import "chart.js/auto";
/* empty css                                                         */
import { C as Card } from "../../../../../chunks/Card.js";
import { f as formatNumber, a as formatBytes } from "../../../../../chunks/format.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let selectedRange = "30";
    head("fdpyiq", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Usage - Kyro</title>`);
      });
    });
    $$renderer2.push(`<div class="usage-page svelte-fdpyiq"><header class="page-header svelte-fdpyiq"><div><h1 class="svelte-fdpyiq">Usage</h1> <p class="subtitle svelte-fdpyiq">Monitor your API usage and resource consumption</p></div></header> <div class="stats-grid svelte-fdpyiq">`);
    Card($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="stat-card svelte-fdpyiq"><span class="stat-icon svelte-fdpyiq">📊</span> <div class="stat-info svelte-fdpyiq"><span class="stat-value svelte-fdpyiq">${escape_html(formatNumber(data.stats.totalRequests))}</span> <span class="stat-label svelte-fdpyiq">Total Requests</span></div></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="stat-card svelte-fdpyiq"><span class="stat-icon svelte-fdpyiq">📥</span> <div class="stat-info svelte-fdpyiq"><span class="stat-value svelte-fdpyiq">${escape_html(formatBytes(data.stats.totalBytesIn))}</span> <span class="stat-label svelte-fdpyiq">Data In</span></div></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="stat-card svelte-fdpyiq"><span class="stat-icon svelte-fdpyiq">📤</span> <div class="stat-info svelte-fdpyiq"><span class="stat-value svelte-fdpyiq">${escape_html(formatBytes(data.stats.totalBytesOut))}</span> <span class="stat-label svelte-fdpyiq">Data Out</span></div></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="stat-card svelte-fdpyiq"><span class="stat-icon svelte-fdpyiq">💾</span> <div class="stat-info svelte-fdpyiq"><span class="stat-value svelte-fdpyiq">${escape_html(formatBytes(data.stats.totalStorage))}</span> <span class="stat-label svelte-fdpyiq">Storage Used</span></div></div>`);
      }
    });
    $$renderer2.push(`<!----></div> `);
    Card($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="chart-header svelte-fdpyiq"><h2 class="svelte-fdpyiq">Request History</h2> <div class="range-selector svelte-fdpyiq"><button${attr_class("range-btn svelte-fdpyiq", void 0, { "active": selectedRange === "7" })}>7D</button> <button${attr_class("range-btn svelte-fdpyiq", void 0, { "active": selectedRange === "30" })}>30D</button> <button${attr_class("range-btn svelte-fdpyiq", void 0, { "active": selectedRange === "90" })}>90D</button></div></div> <div class="chart-container svelte-fdpyiq"><canvas></canvas></div>`);
      }
    });
    $$renderer2.push(`<!----></div>`);
  });
}
export {
  _page as default
};
