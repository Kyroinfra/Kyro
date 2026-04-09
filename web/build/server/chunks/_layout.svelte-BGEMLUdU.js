import { d as ensure_array_like, l as store_get, n as attr, f as attr_class, j as escape_html, m as unsubscribe_stores } from './renderer-DMNwzsJT.js';
import { p as page } from './stores-BAg9FtxV.js';
import { u as user } from './auth-F4mmdpWG.js';
import { K as Key, F as File, U as Usage } from './Usage-BeI54Fh3.js';
import './root-B5IRCJso.js';
import './state.svelte-CRDQ7jvG.js';
import './index-Dw650lR_.js';

function Dashboard($$renderer, $$props) {
  let { size = 18 } = $$props;
  $$renderer.push(`<svg${attr("width", size)}${attr("height", size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>`);
}
function Settings($$renderer, $$props) {
  let { size = 18 } = $$props;
  $$renderer.push(`<svg${attr("width", size)}${attr("height", size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`);
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data, children } = $$props;
    const navItems = [
      { href: "/dashboard", label: "Dashboard", icon: Dashboard },
      { href: "/dashboard/keys", label: "API Keys", icon: Key },
      { href: "/dashboard/files", label: "Files", icon: File },
      { href: "/dashboard/usage", label: "Usage", icon: Usage },
      {
        href: "/dashboard/settings",
        label: "Settings",
        icon: Settings
      }
    ];
    function getInitials(email) {
      return email ? email.substring(0, 2).toUpperCase() : "U";
    }
    $$renderer2.push(`<div class="app-layout svelte-1v2axqk"><aside class="sidebar svelte-1v2axqk"><div class="sidebar-header svelte-1v2axqk"><a href="/" class="logo svelte-1v2axqk"><span class="logo-mark svelte-1v2axqk">K</span> <span class="logo-text">kyro</span></a></div> <nav class="sidebar-nav svelte-1v2axqk"><!--[-->`);
    const each_array = ensure_array_like(navItems);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      const isActive = store_get($$store_subs ??= {}, "$page", page).url.pathname === item.href || store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith(item.href) && item.href !== "/dashboard";
      $$renderer2.push(`<a${attr("href", item.href)}${attr_class("nav-item svelte-1v2axqk", void 0, { "active": isActive })}><span class="nav-icon svelte-1v2axqk">`);
      if (item.icon) {
        $$renderer2.push("<!--[-->");
        item.icon($$renderer2, { size: 16 });
        $$renderer2.push("<!--]-->");
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push("<!--]-->");
      }
      $$renderer2.push(`</span> <span class="nav-label svelte-1v2axqk">${escape_html(item.label)}</span> `);
      if (isActive) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="nav-indicator svelte-1v2axqk">></span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></a>`);
    }
    $$renderer2.push(`<!--]--></nav> <div class="sidebar-footer svelte-1v2axqk"><button class="logout-btn svelte-1v2axqk"><span class="nav-icon svelte-1v2axqk"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></span> <span>Logout</span></button></div></aside> <div class="main-wrapper svelte-1v2axqk"><header class="topbar svelte-1v2axqk"><div class="topbar-left svelte-1v2axqk"><span class="prompt svelte-1v2axqk">$</span> <h1 class="page-title svelte-1v2axqk">${escape_html(store_get($$store_subs ??= {}, "$page", page).url.pathname.replace("/dashboard", "dashboard").replace("/", ""))}</h1></div> <div class="topbar-right"><div class="user-menu svelte-1v2axqk"><div class="user-avatar svelte-1v2axqk">${escape_html(getInitials(store_get($$store_subs ??= {}, "$user", user)?.email || ""))}</div> <div class="user-info svelte-1v2axqk"><span class="user-role svelte-1v2axqk">${escape_html(store_get($$store_subs ??= {}, "$user", user)?.role)}</span></div></div></div></header> <main class="main-content svelte-1v2axqk">`);
    children($$renderer2);
    $$renderer2.push(`<!----></main></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte-BGEMLUdU.js.map
