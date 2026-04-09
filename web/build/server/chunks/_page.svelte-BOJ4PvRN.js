import { p as head, j as escape_html } from './renderer-DMNwzsJT.js';
import './root-B5IRCJso.js';
import './state.svelte-CRDQ7jvG.js';
import { B as Button } from './Button-DjoCCVRh.js';
import { I as Input } from './Input-6YlKvBXD.js';
import { C as Card } from './Card-Bm2Np101.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { form } = $$props;
    let orgName = "";
    let email = "";
    let password = "";
    let loading = false;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("ydeots", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Register - Kyro</title>`);
        });
      });
      $$renderer3.push(`<div class="auth-page svelte-ydeots"><div class="auth-header svelte-ydeots"><div class="logo svelte-ydeots"><span class="logo-mark svelte-ydeots">K</span> <span class="logo-text">kyro</span></div> <p class="auth-command svelte-ydeots">$ register</p></div> `);
      Card($$renderer3, {
        padding: "lg",
        children: ($$renderer4) => {
          $$renderer4.push(`<form method="POST"><div class="auth-form svelte-ydeots">`);
          if (form?.error) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="form-error svelte-ydeots">${escape_html(form.error)}</div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> `);
          Input($$renderer4, {
            name: "orgName",
            label: "Organization",
            type: "text",
            placeholder: "my-org",
            required: true,
            get value() {
              return orgName;
            },
            set value($$value) {
              orgName = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----> `);
          Input($$renderer4, {
            name: "email",
            label: "Email",
            type: "email",
            placeholder: "user@domain.com",
            required: true,
            get value() {
              return email;
            },
            set value($$value) {
              email = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----> `);
          Input($$renderer4, {
            name: "password",
            label: "Password",
            type: "password",
            placeholder: "********",
            required: true,
            get value() {
              return password;
            },
            set value($$value) {
              password = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----> `);
          Button($$renderer4, {
            type: "submit",
            loading,
            disabled: loading,
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->${escape_html("Create Account")}`);
            }
          });
          $$renderer4.push(`<!----></div></form>`);
        }
      });
      $$renderer3.push(`<!----> <p class="footer-text svelte-ydeots"><span class="prompt svelte-ydeots">></span> Have account? <a href="/login" class="svelte-ydeots">Sign in</a></p></div>`);
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
//# sourceMappingURL=_page.svelte-BOJ4PvRN.js.map
