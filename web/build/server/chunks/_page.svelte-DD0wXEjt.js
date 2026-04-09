import { p as head, n as attr, j as escape_html, f as attr_class, d as ensure_array_like, k as derived, l as store_get, m as unsubscribe_stores } from './renderer-DMNwzsJT.js';
import { u as user } from './auth-F4mmdpWG.js';
import { B as Button } from './Button-DjoCCVRh.js';
import { C as Card } from './Card-Bm2Np101.js';
import { C as ConfirmDialog } from './ConfirmDialog-BJ8Yq1q0.js';
import { a as formatBytes, b as formatDateTime } from './format-qfo27skI.js';
import { g as getFiles, d as deleteFile } from './6-6kylS_cX.js';
import './index-Dw650lR_.js';
import './index-aGhFOaj4.js';
import './keys-8Nk1pJI6.js';
import './client-DJm-nEfN.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    let files = data.files;
    let hasApiKey = data.hasApiKey;
    let apiKeyPrefix = data.apiKeyPrefix;
    let apiKey = "";
    let apiKeyVerified = false;
    let verifyingApiKey = false;
    let apiKeyError = null;
    let showDeleteConfirm = false;
    let fileToDelete = null;
    let dragOver = false;
    const canManage = derived(() => store_get($$store_subs ??= {}, "$user", user)?.role === "owner" || store_get($$store_subs ??= {}, "$user", user)?.role === "admin");
    async function verifyApiKey() {
      if (!apiKey.trim()) {
        apiKeyError = "Please enter an API key";
        return;
      }
      verifyingApiKey = true;
      apiKeyError = null;
      try {
        await getFiles(apiKey);
        apiKeyVerified = true;
        apiKeyError = null;
      } catch (error) {
        apiKeyError = error.message || "Invalid API key. Make sure it has write scope.";
        apiKeyVerified = false;
      } finally {
        verifyingApiKey = false;
      }
    }
    function changeApiKey() {
      apiKeyVerified = false;
      apiKey = "";
      apiKeyError = null;
    }
    async function handleDelete() {
      if (!fileToDelete || !apiKey) return;
      try {
        await deleteFile(apiKey, fileToDelete.id);
        files = files.filter((f) => f.id !== fileToDelete.id);
      } catch (error) {
        console.error("Delete failed:", error);
      } finally {
        showDeleteConfirm = false;
        fileToDelete = null;
      }
    }
    function confirmDelete(file) {
      fileToDelete = file;
      showDeleteConfirm = true;
    }
    function downloadFile(file) {
      if (!apiKey) return;
      const url = `/api/files/${file.id}?key=${encodeURIComponent(apiKey)}`;
      window.open(url, "_blank");
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
        Card($$renderer3, {
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="api-key-section svelte-s6cb1u"><div class="api-key-header svelte-s6cb1u"><span class="api-key-icon svelte-s6cb1u">🔐</span> <span class="api-key-title svelte-s6cb1u">API Key</span></div> `);
            if (!apiKeyVerified) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<div class="api-key-input-section svelte-s6cb1u"><p class="api-key-desc svelte-s6cb1u">Enter an API key with write scope to manage files</p> <div class="api-key-row svelte-s6cb1u"><input type="password" class="api-key-input svelte-s6cb1u"${attr("value", apiKey)} placeholder="kyr_xxx..."/> `);
              Button($$renderer4, {
                onclick: verifyApiKey,
                loading: verifyingApiKey,
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Verify`);
                }
              });
              $$renderer4.push(`<!----></div> `);
              if (apiKeyError) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<div class="api-key-error svelte-s6cb1u">${escape_html(apiKeyError)}</div>`);
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--></div>`);
            } else {
              $$renderer4.push("<!--[-1-->");
              $$renderer4.push(`<div class="api-key-verified svelte-s6cb1u"><div class="verified-info svelte-s6cb1u"><span class="verified-icon svelte-s6cb1u">✓</span> <span class="verified-text svelte-s6cb1u">Connected</span> `);
              if (apiKeyPrefix) {
                $$renderer4.push("<!--[0-->");
                $$renderer4.push(`<span class="verified-prefix svelte-s6cb1u">key_${escape_html(apiKeyPrefix)}***</span>`);
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--></div> `);
              Button($$renderer4, {
                variant: "ghost",
                size: "sm",
                onclick: changeApiKey,
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->Change`);
                }
              });
              $$renderer4.push(`<!----></div>`);
            }
            $$renderer4.push(`<!--]--></div>`);
          }
        });
        $$renderer3.push(`<!----> `);
        if (apiKeyVerified) {
          $$renderer3.push("<!--[0-->");
          Card($$renderer3, {
            children: ($$renderer4) => {
              $$renderer4.push(`<div${attr_class("upload-zone svelte-s6cb1u", void 0, { "drag-over": dragOver })}>`);
              {
                $$renderer4.push("<!--[-1-->");
                $$renderer4.push(`<span class="upload-icon svelte-s6cb1u">📤</span> <span class="upload-text svelte-s6cb1u">Drag and drop files here, or</span> <label class="upload-btn svelte-s6cb1u"><input type="file" class="file-input svelte-s6cb1u" accept="*/*"/> `);
                Button($$renderer4, {
                  children: ($$renderer5) => {
                    $$renderer5.push(`<!---->Browse Files`);
                  }
                });
                $$renderer4.push(`<!----></label>`);
              }
              $$renderer4.push(`<!--]--></div> `);
              {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]-->`);
            }
          });
          $$renderer3.push(`<!----> `);
          if (files.length === 0) {
            $$renderer3.push("<!--[0-->");
            Card($$renderer3, {
              children: ($$renderer4) => {
                $$renderer4.push(`<div class="empty-state svelte-s6cb1u"><span class="empty-icon svelte-s6cb1u">📁</span> <h3 class="svelte-s6cb1u">No files yet</h3> <p class="svelte-s6cb1u">Upload your first file to get started.</p></div>`);
              }
            });
          } else {
            $$renderer3.push("<!--[-1-->");
            $$renderer3.push(`<div class="files-list svelte-s6cb1u"><!--[-->`);
            const each_array = ensure_array_like(files);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let file = each_array[$$index];
              Card($$renderer3, {
                children: ($$renderer4) => {
                  $$renderer4.push(`<div class="file-card svelte-s6cb1u"><div class="file-info svelte-s6cb1u"><div class="file-name svelte-s6cb1u">${escape_html(file.name)}</div> <div class="file-meta svelte-s6cb1u"><span>${escape_html(formatBytes(file.sizeBytes))}</span> <span>•</span> <span>${escape_html(file.mimeType)}</span> <span>•</span> <span>${escape_html(formatDateTime(file.createdAt))}</span></div></div> <div class="file-actions svelte-s6cb1u">`);
                  Button($$renderer4, {
                    variant: "secondary",
                    size: "sm",
                    onclick: () => downloadFile(file),
                    children: ($$renderer5) => {
                      $$renderer5.push(`<!---->Download`);
                    }
                  });
                  $$renderer4.push(`<!----> `);
                  if (canManage()) {
                    $$renderer4.push("<!--[0-->");
                    Button($$renderer4, {
                      variant: "danger",
                      size: "sm",
                      onclick: () => confirmDelete(file),
                      children: ($$renderer5) => {
                        $$renderer5.push(`<!---->Delete`);
                      }
                    });
                  } else {
                    $$renderer4.push("<!--[-1-->");
                  }
                  $$renderer4.push(`<!--]--></div></div>`);
                }
              });
            }
            $$renderer3.push(`<!--]--></div>`);
          }
          $$renderer3.push(`<!--]-->`);
        } else {
          $$renderer3.push("<!--[-1-->");
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
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DD0wXEjt.js.map
