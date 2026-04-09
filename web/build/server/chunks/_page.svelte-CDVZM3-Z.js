import { p as head, n as attr } from './renderer-DMNwzsJT.js';
import './root-B5IRCJso.js';
import './state.svelte-CRDQ7jvG.js';
import './auth-F4mmdpWG.js';
import { B as Button } from './Button-DjoCCVRh.js';
import { C as Card } from './Card-Bm2Np101.js';
import { C as ConfirmDialog } from './ConfirmDialog-BJ8Yq1q0.js';
import './index-Dw650lR_.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    data.files;
    let hasApiKey = data.hasApiKey;
    data.apiKeyPrefix;
    let apiKey = "";
    let showDeleteConfirm = false;
    async function handleDelete() {
      return;
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("s6cb1u", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Files - Kyro</title>`);
        });
      });
      $$renderer3.push(`<div class="files-page svelte-s6cb1u"><header class="page-header svelte-s6cb1u"><div><h1 class="svelte-s6cb1u">Files</h1> <p class="subtitle svelte-s6cb1u">Manage your organization's uploaded files</p></div></header> `);
      if (!hasApiKey) {
        $$renderer3.push("<!--[0-->");
        Card($$renderer3, {
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="empty-state svelte-s6cb1u"><span class="empty-icon svelte-s6cb1u">🔑</span> <h3 class="svelte-s6cb1u">API Key Required</h3> <p class="svelte-s6cb1u">You need at least one API key with write scope to upload and manage files.</p> <a href="/dashboard/keys">`);
            Button($$renderer4, {
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Create API Key`);
              }
            });
            $$renderer4.push(`<!----></a></div>`);
          }
        });
      } else {
        $$renderer3.push("<!--[-1-->");
        {
          $$renderer3.push("<!--[0-->");
          Card($$renderer3, {
            children: ($$renderer4) => {
              $$renderer4.push(`<div class="api-key-prompt svelte-s6cb1u"><h3 class="svelte-s6cb1u">Enter API Key</h3> <p class="svelte-s6cb1u">Enter an API key with write scope to manage files.</p> <div class="api-key-input svelte-s6cb1u"><input type="password"${attr("value", apiKey)} placeholder="kyr_xxx..." class="svelte-s6cb1u"/></div></div>`);
            }
          });
        }
        $$renderer3.push(`<!--]-->`);
      }
      $$renderer3.push(`<!--]--></div> `);
      ConfirmDialog($$renderer3, {
        title: "Delete File",
        message: "Are you sure you want to delete this file? This action cannot be undone.",
        confirmLabel: "Delete",
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
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-CDVZM3-Z.js.map
