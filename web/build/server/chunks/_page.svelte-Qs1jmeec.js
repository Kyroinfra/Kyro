import { p as head, j as escape_html, d as ensure_array_like, k as derived, l as store_get, n as attr, m as unsubscribe_stores } from './renderer-DMNwzsJT.js';
import './root-B5IRCJso.js';
import './state.svelte-CRDQ7jvG.js';
import { u as user } from './auth-F4mmdpWG.js';
import { B as Button } from './Button-DjoCCVRh.js';
import { C as Card } from './Card-Bm2Np101.js';
import { B as Badge, M as Modal } from './Modal-BZDSGHcl.js';
import { C as ConfirmDialog } from './ConfirmDialog-BJ8Yq1q0.js';
import { b as formatDate, c as formatDateTime } from './format-C-eCNYhK.js';
import './index-Dw650lR_.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data, form } = $$props;
    let showCreateModal = false;
    let showDeleteConfirm = false;
    let keyToDelete = null;
    let copied = false;
    let creating = false;
    let newKey = form?.newKey || null;
    let keyName = "";
    let selectedScopes = ["read"];
    const canManage = derived(() => store_get($$store_subs ??= {}, "$user", user)?.role === "owner" || store_get($$store_subs ??= {}, "$user", user)?.role === "admin");
    function handleCopy() {
      if (newKey) {
        navigator.clipboard.writeText(newKey);
        copied = true;
        setTimeout(() => copied = false, 2e3);
      }
    }
    function confirmDelete(id) {
      keyToDelete = id;
      showDeleteConfirm = true;
    }
    async function handleDelete() {
      if (!keyToDelete) return;
      const formData = new FormData();
      formData.append("id", keyToDelete);
      await fetch("?/delete", { method: "POST", body: formData });
      showDeleteConfirm = false;
      keyToDelete = null;
      window.location.reload();
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1584yhn", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>API Keys - Kyro</title>`);
        });
      });
      $$renderer3.push(`<div class="keys-page svelte-1584yhn"><header class="page-header svelte-1584yhn"><div><h1 class="svelte-1584yhn">API Keys</h1> <p class="subtitle svelte-1584yhn">Manage your organization's API keys</p></div> `);
      if (canManage()) {
        $$renderer3.push("<!--[0-->");
        Button($$renderer3, {
          onclick: () => showCreateModal = true,
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Create Key`);
          }
        });
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--></header> `);
      if (newKey) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="key-reveal svelte-1584yhn"><div class="key-reveal-header svelte-1584yhn"><span class="key-reveal-icon svelte-1584yhn">🔑</span> <span class="key-reveal-title svelte-1584yhn">Your new API key</span> <button class="dismiss-btn svelte-1584yhn">✕</button></div> <p class="key-reveal-warning svelte-1584yhn">Copy this key now — it won't be shown again.</p> <div class="key-value svelte-1584yhn"><code class="svelte-1584yhn">${escape_html(newKey)}</code> `);
        Button($$renderer3, {
          variant: "secondary",
          size: "sm",
          onclick: handleCopy,
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->${escape_html(copied ? "Copied!" : "Copy")}`);
          }
        });
        $$renderer3.push(`<!----></div></div>`);
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (data.keys.length === 0) {
        $$renderer3.push("<!--[0-->");
        Card($$renderer3, {
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="empty-state svelte-1584yhn"><span class="empty-icon svelte-1584yhn">🔑</span> <h3 class="svelte-1584yhn">No API keys yet</h3> <p class="svelte-1584yhn">Create your first API key to start making requests to the Kyro API.</p> `);
            if (canManage()) {
              $$renderer4.push("<!--[0-->");
              Button($$renderer4, {
                onclick: () => showCreateModal = true,
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Create Your First Key`);
                }
              });
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--></div>`);
          }
        });
      } else {
        $$renderer3.push("<!--[-1-->");
        $$renderer3.push(`<div class="keys-list svelte-1584yhn"><!--[-->`);
        const each_array = ensure_array_like(data.keys);
        for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
          let key = each_array[$$index_1];
          Card($$renderer3, {
            children: ($$renderer4) => {
              $$renderer4.push(`<div class="key-card svelte-1584yhn"><div class="key-info svelte-1584yhn"><div class="key-name svelte-1584yhn">${escape_html(key.name)}</div> <div class="key-prefix svelte-1584yhn">key_${escape_html(key.prefix)}***</div> <div class="key-meta svelte-1584yhn"><span class="key-date svelte-1584yhn">Created ${escape_html(formatDate(key.createdAt))}</span> `);
              if (key.lastUsedAt) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<span class="key-date svelte-1584yhn">Last used ${escape_html(formatDateTime(key.lastUsedAt))}</span>`);
              } else {
                $$renderer4.push("<!--[-1-->");
                $$renderer4.push(`<span class="key-date svelte-1584yhn">Never used</span>`);
              }
              $$renderer4.push(`<!--]--></div> <div class="key-scopes svelte-1584yhn"><!--[-->`);
              const each_array_1 = ensure_array_like(key.scopes);
              for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
                let scope = each_array_1[$$index];
                Badge($$renderer4, {
                  children: ($$renderer5) => {
                    $$renderer5.push(`<!---->${escape_html(scope)}`);
                  }
                });
              }
              $$renderer4.push(`<!--]--></div></div> `);
              if (canManage()) {
                $$renderer4.push("<!--[0-->");
                Button($$renderer4, {
                  variant: "danger",
                  size: "sm",
                  onclick: () => confirmDelete(key.id),
                  children: ($$renderer5) => {
                    $$renderer5.push(`<!---->Revoke`);
                  }
                });
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--></div>`);
            }
          });
        }
        $$renderer3.push(`<!--]--></div>`);
      }
      $$renderer3.push(`<!--]--></div> `);
      Modal($$renderer3, {
        title: "Create API Key",
        onclose: () => showCreateModal = false,
        get open() {
          return showCreateModal;
        },
        set open($$value) {
          showCreateModal = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<form method="POST" action="?/create"><div class="form-group svelte-1584yhn"><label for="key-name" class="svelte-1584yhn">Name</label> <input type="text" id="key-name" name="name"${attr("value", keyName)} placeholder="My API Key" required="" class="svelte-1584yhn"/></div> <div class="form-group svelte-1584yhn"><label class="svelte-1584yhn">Scopes</label> <div class="scopes-grid svelte-1584yhn"><label class="scope-checkbox svelte-1584yhn"><input type="checkbox" name="scopes" value="read"${attr("checked", selectedScopes.includes("read"), true)} class="svelte-1584yhn"/> <span class="svelte-1584yhn">Read</span></label> <label class="scope-checkbox svelte-1584yhn"><input type="checkbox" name="scopes" value="write"${attr("checked", selectedScopes.includes("write"), true)} class="svelte-1584yhn"/> <span class="svelte-1584yhn">Write</span></label> <label class="scope-checkbox svelte-1584yhn"><input type="checkbox" name="scopes" value="admin"${attr("checked", selectedScopes.includes("admin"), true)} class="svelte-1584yhn"/> <span class="svelte-1584yhn">Admin</span></label></div></div> `);
          {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> <div class="form-actions svelte-1584yhn">`);
          Button($$renderer4, {
            variant: "secondary",
            onclick: () => showCreateModal = false,
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Cancel`);
            }
          });
          $$renderer4.push(`<!----> `);
          Button($$renderer4, {
            type: "submit",
            loading: creating,
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Create Key`);
            }
          });
          $$renderer4.push(`<!----></div></form>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      ConfirmDialog($$renderer3, {
        title: "Revoke API Key",
        message: "Are you sure you want to revoke this API key? Any applications using this key will stop working.",
        confirmLabel: "Revoke",
        variant: "danger",
        onconfirm: handleDelete,
        oncancel: () => showDeleteConfirm = false,
        get open() {
          return showDeleteConfirm;
        },
        set open($$value) {
          showDeleteConfirm = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-Qs1jmeec.js.map
