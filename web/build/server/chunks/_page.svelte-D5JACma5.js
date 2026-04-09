import { p as head, j as escape_html, d as ensure_array_like, k as derived, l as store_get, h as stringify, m as unsubscribe_stores } from './renderer-DMNwzsJT.js';
import './root-B5IRCJso.js';
import './state.svelte-CRDQ7jvG.js';
import { u as user } from './auth-F4mmdpWG.js';
import { B as Button } from './Button-DjoCCVRh.js';
import { C as Card } from './Card-Bm2Np101.js';
import { B as Badge, M as Modal } from './Modal-D0nBhcR7.js';
import { C as ConfirmDialog } from './ConfirmDialog-OhxTsgc8.js';
import { b as formatDate } from './format-Dn_JvzeH.js';
import './index-Dw650lR_.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data, form } = $$props;
    let org = data.org;
    let members = data.members;
    let showInviteModal = false;
    let showRemoveConfirm = false;
    let memberToRemove = null;
    let inviting = false;
    const isOwner = derived(() => store_get($$store_subs ??= {}, "$user", user)?.role === "owner");
    function confirmRemove(member) {
      memberToRemove = member;
      showRemoveConfirm = true;
    }
    async function handleRemove() {
      if (!memberToRemove) return;
      const formData = new FormData();
      formData.append("id", memberToRemove.id);
      await fetch("?/remove", { method: "POST", body: formData });
      showRemoveConfirm = false;
      memberToRemove = null;
      window.location.reload();
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1jrfzug", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Settings - Kyro</title>`);
        });
      });
      $$renderer3.push(`<div class="settings-page svelte-1jrfzug"><header class="page-header svelte-1jrfzug"><div class="header-content"><span class="prompt">$</span> <span class="command">./settings.sh</span></div></header> `);
      if (org) {
        $$renderer3.push("<!--[0-->");
        Card($$renderer3, {
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="section svelte-1jrfzug"><div class="section-title">// Organization</div> <div class="org-info svelte-1jrfzug"><div class="org-field svelte-1jrfzug"><label class="svelte-1jrfzug">Name</label> <span class="svelte-1jrfzug">${escape_html(org.name)}</span></div> <div class="org-field svelte-1jrfzug"><label class="svelte-1jrfzug">Slug</label> <span class="svelte-1jrfzug">${escape_html(org.slug)}</span></div> <div class="org-field svelte-1jrfzug"><label class="svelte-1jrfzug">Plan</label> `);
            Badge($$renderer4, {
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->${escape_html(org.plan)}`);
              }
            });
            $$renderer4.push(`<!----></div> <div class="org-field svelte-1jrfzug"><label class="svelte-1jrfzug">Created</label> <span class="svelte-1jrfzug">${escape_html(formatDate(org.createdAt))}</span></div></div></div>`);
          }
        });
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> `);
      Card($$renderer3, {
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="section svelte-1jrfzug"><div class="section-header svelte-1jrfzug"><span class="section-title">// Team Members</span> `);
          if (isOwner()) {
            $$renderer4.push("<!--[0-->");
            Button($$renderer4, {
              onclick: () => showInviteModal = true,
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->+ Invite`);
              }
            });
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--></div> `);
          if (members.length === 0) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<p class="empty-message svelte-1jrfzug">No members found.</p>`);
          } else {
            $$renderer4.push("<!--[-1-->");
            $$renderer4.push(`<div class="members-list svelte-1jrfzug"><!--[-->`);
            const each_array = ensure_array_like(members);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let member = each_array[$$index];
              $$renderer4.push(`<div class="member-row svelte-1jrfzug"><div class="member-info svelte-1jrfzug"><span class="member-email svelte-1jrfzug">${escape_html(member.email)}</span> <span class="member-date svelte-1jrfzug">Joined ${escape_html(formatDate(member.createdAt))}</span></div> <div class="member-role">`);
              Badge($$renderer4, {
                children: ($$renderer5) => {
                  $$renderer5.push(`<!---->${escape_html(member.role)}`);
                }
              });
              $$renderer4.push(`<!----></div> `);
              if (isOwner() && member.role !== "owner") {
                $$renderer4.push("<!--[0-->");
                Button($$renderer4, {
                  variant: "danger",
                  size: "sm",
                  onclick: () => confirmRemove({ id: member.id, email: member.email }),
                  children: ($$renderer5) => {
                    $$renderer5.push(`<!---->Remove`);
                  }
                });
              } else {
                $$renderer4.push("<!--[-1-->");
              }
              $$renderer4.push(`<!--]--></div>`);
            }
            $$renderer4.push(`<!--]--></div>`);
          }
          $$renderer4.push(`<!--]--></div>`);
        }
      });
      $$renderer3.push(`<!----> `);
      if (isOwner()) {
        $$renderer3.push("<!--[0-->");
        Card($$renderer3, {
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="section danger-zone svelte-1jrfzug"><h2 class="svelte-1jrfzug">Danger Zone</h2> <p class="danger-warning svelte-1jrfzug">These actions are irreversible. Please proceed with caution.</p> <div class="danger-actions svelte-1jrfzug"><div class="danger-item svelte-1jrfzug"><div class="danger-info svelte-1jrfzug"><span class="danger-label svelte-1jrfzug">Delete Organization</span> <span class="danger-desc svelte-1jrfzug">Permanently delete this organization and all its data.</span></div> `);
            Button($$renderer4, {
              variant: "danger",
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Delete Organization`);
              }
            });
            $$renderer4.push(`<!----></div></div></div>`);
          }
        });
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--></div> `);
      Modal($$renderer3, {
        title: "Invite Member",
        onclose: () => showInviteModal = false,
        get open() {
          return showInviteModal;
        },
        set open($$value) {
          showInviteModal = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<form method="POST" action="?/invite"><div class="form-group svelte-1jrfzug"><label for="invite-email" class="svelte-1jrfzug">Email</label> <input type="email" id="invite-email" name="email" placeholder="member@example.com" required="" class="svelte-1jrfzug"/></div> <div class="form-group svelte-1jrfzug"><label for="invite-password" class="svelte-1jrfzug">Password</label> <input type="password" id="invite-password" name="password" placeholder="Enter a temporary password" required="" class="svelte-1jrfzug"/></div> <div class="form-group svelte-1jrfzug"><label for="invite-role" class="svelte-1jrfzug">Role</label> <select id="invite-role" name="role" required="" class="svelte-1jrfzug">`);
          $$renderer4.option({ value: "member" }, ($$renderer5) => {
            $$renderer5.push(`Member`);
          });
          $$renderer4.option({ value: "admin" }, ($$renderer5) => {
            $$renderer5.push(`Admin`);
          });
          $$renderer4.push(`</select></div> `);
          {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> <div class="form-actions svelte-1jrfzug">`);
          Button($$renderer4, {
            variant: "secondary",
            onclick: () => showInviteModal = false,
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Cancel`);
            }
          });
          $$renderer4.push(`<!----> `);
          Button($$renderer4, {
            type: "submit",
            loading: inviting,
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Send Invite`);
            }
          });
          $$renderer4.push(`<!----></div></form>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      ConfirmDialog($$renderer3, {
        title: "Remove Member",
        message: `Are you sure you want to remove ${stringify(memberToRemove?.email)} from this organization?`,
        confirmLabel: "Remove",
        variant: "danger",
        onconfirm: handleRemove,
        oncancel: () => showRemoveConfirm = false,
        get open() {
          return showRemoveConfirm;
        },
        set open($$value) {
          showRemoveConfirm = $$value;
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
//# sourceMappingURL=_page.svelte-D5JACma5.js.map
