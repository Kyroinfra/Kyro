import { c as ensure_array_like, m as attr, d as attr_class, k as store_get, h as escape_html, l as unsubscribe_stores, n as bind_props } from './renderer-DLnxqfrv.js';
import { r as redirect } from './index-aGhFOaj4.js';
import { p as page } from './stores-D3eGA51e.js';
import { u as user } from './auth-DoP_VBlP.js';
import './root-XENmHcWE.js';
import './index-nmK-lLzQ.js';

function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const load = async ({ locals }) => {
      if (!locals.user) {
        throw redirect(302, "/login");
      }
      return { user: locals.user };
    };
    let { data, children } = $$props;
    const navItems = [
      { href: "/dashboard", label: "Dashboard", icon: "🏠" },
      { href: "/dashboard/keys", label: "API Keys", icon: "🔑" },
      { href: "/dashboard/files", label: "Files", icon: "📁" },
      { href: "/dashboard/usage", label: "Usage", icon: "📊" },
      { href: "/dashboard/settings", label: "Settings", icon: "⚙️" }
    ];
    function getInitials(email) {
      return email ? email.substring(0, 2).toUpperCase() : "U";
    }
    $$renderer2.push(`<div class="app-layout svelte-1v2axqk"><aside class="sidebar svelte-1v2axqk"><div class="sidebar-header svelte-1v2axqk"><a href="/" class="logo svelte-1v2axqk"><span class="logo-icon svelte-1v2axqk">K</span> <span class="logo-text">Kyro</span></a></div> <nav class="sidebar-nav svelte-1v2axqk"><!--[-->`);
    const each_array = ensure_array_like(navItems);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      $$renderer2.push(`<a${attr("href", item.href)}${attr_class("nav-item svelte-1v2axqk", void 0, {
        "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === item.href || store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith(item.href) && item.href !== "/dashboard"
      })}><span class="nav-icon svelte-1v2axqk">${escape_html(item.icon)}</span> <span class="nav-label">${escape_html(item.label)}</span></a>`);
    }
    $$renderer2.push(`<!--]--></nav> <div class="sidebar-footer svelte-1v2axqk"><button class="logout-btn svelte-1v2axqk"><span>📤</span> <span>Logout</span></button></div></aside> <div class="main-wrapper svelte-1v2axqk"><header class="topbar svelte-1v2axqk"><div class="topbar-left"><h1 class="page-title svelte-1v2axqk">Dashboard</h1></div> <div class="topbar-right"><div class="user-menu svelte-1v2axqk"><div class="user-avatar svelte-1v2axqk">${escape_html(getInitials(store_get($$store_subs ??= {}, "$user", user)?.email || ""))}</div> <div class="user-info svelte-1v2axqk"><span class="user-email svelte-1v2axqk">${escape_html(store_get($$store_subs ??= {}, "$user", user)?.email || "User")}</span> <span class="user-role svelte-1v2axqk">${escape_html(store_get($$store_subs ??= {}, "$user", user)?.role)}</span></div></div></div></header> <main class="main-content svelte-1v2axqk">`);
    children($$renderer2);
    $$renderer2.push(`<!----></main></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { load });
  });
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte-DQme2qrJ.js.map
