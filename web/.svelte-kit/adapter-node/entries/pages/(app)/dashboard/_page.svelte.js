import { h as head, e as ensure_array_like, b as escape_html } from "../../../../chunks/renderer.js";
import { C as Card } from "../../../../chunks/Card.js";
/* empty css                                                      */
import { K as Key, U as Usage, F as File } from "../../../../chunks/Usage.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const stats = [
      {
        label: "API Keys",
        value: data.stats.activeApiKeys,
        icon: Key
      },
      {
        label: "Requests",
        value: data.stats.totalRequests,
        icon: Usage
      },
      {
        label: "Storage",
        value: formatBytes(data.stats.totalStorage),
        icon: File
      },
      { label: "Members", value: data.stats.totalMembers, icon: null }
    ];
    function formatBytes(bytes) {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    }
    head("1tyszyy", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Dashboard - Kyro</title>`);
      });
    });
    $$renderer2.push(`<div class="dashboard svelte-1tyszyy"><header class="dashboard-header svelte-1tyszyy"><span class="prompt svelte-1tyszyy">$</span> <span class="command svelte-1tyszyy">./dashboard.sh</span></header> <div class="stats-section"><div class="section-label svelte-1tyszyy">// Statistics</div> <div class="stats-grid svelte-1tyszyy"><!--[-->`);
    const each_array = ensure_array_like(stats);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let stat = each_array[$$index];
      Card($$renderer2, {
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="stat-card svelte-1tyszyy"><div class="stat-header svelte-1tyszyy">`);
          if (stat.icon) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<span class="stat-icon svelte-1tyszyy">`);
            if (stat.icon) {
              $$renderer3.push("<!--[-->");
              stat.icon($$renderer3, { size: 14 });
              $$renderer3.push("<!--]-->");
            } else {
              $$renderer3.push("<!--[!-->");
              $$renderer3.push("<!--]-->");
            }
            $$renderer3.push(`</span>`);
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--> <span class="stat-label svelte-1tyszyy">${escape_html(stat.label)}</span></div> <div class="stat-value svelte-1tyszyy"><span class="bracket svelte-1tyszyy">[</span> <span class="value svelte-1tyszyy">${escape_html(typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value)}</span> <span class="bracket svelte-1tyszyy">]</span></div></div>`);
        }
      });
    }
    $$renderer2.push(`<!--]--></div></div> <div class="actions-section svelte-1tyszyy"><div class="section-label svelte-1tyszyy">// Quick Actions</div> <div class="actions-grid svelte-1tyszyy"><a href="/dashboard/keys" class="action-card svelte-1tyszyy"><span class="action-marker svelte-1tyszyy">></span> <span class="action-label svelte-1tyszyy">Create API Key</span></a> <a href="/dashboard/files" class="action-card svelte-1tyszyy"><span class="action-marker svelte-1tyszyy">></span> <span class="action-label svelte-1tyszyy">Upload File</span></a> <a href="/dashboard/usage" class="action-card svelte-1tyszyy"><span class="action-marker svelte-1tyszyy">></span> <span class="action-label svelte-1tyszyy">View Analytics</span></a> <a href="/dashboard/settings" class="action-card svelte-1tyszyy"><span class="action-marker svelte-1tyszyy">></span> <span class="action-label svelte-1tyszyy">Settings</span></a></div></div></div>`);
  });
}
export {
  _page as default
};
