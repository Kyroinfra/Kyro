import { p as head, j as escape_html } from './renderer-DMNwzsJT.js';
import './root-B5IRCJso.js';
import './state.svelte-CRDQ7jvG.js';
import { B as Button } from './Button-DjoCCVRh.js';
import { I as Input } from './Input-BcSAlg1S.js';
import { C as Card } from './Card-Bm2Np101.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { form } = $$props;
    let email = "";
    let password = "";
    let loading = false;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("8k30lk", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Sign In - Kyro</title>`);
        });
      });
      $$renderer3.push(`<div class="auth-page svelte-8k30lk"><div class="auth-header svelte-8k30lk"><a href="/" class="logo svelte-8k30lk"><span class="logo-icon svelte-8k30lk">K</span> <span class="logo-text">Kyro</span></a></div> `);
      Card($$renderer3, {
        padding: "lg",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="auth-form svelte-8k30lk"><h1 class="svelte-8k30lk">Welcome back</h1> <p class="subtitle svelte-8k30lk">Sign in to your account</p> <form method="POST" class="svelte-8k30lk">`);
          if (form?.error) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="form-error">${escape_html(form.error)}</div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> `);
          Input($$renderer4, {
            name: "email",
            label: "Email",
            type: "email",
            placeholder: "you@example.com",
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
            placeholder: "••••••••",
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
              $$renderer5.push(`<!---->${escape_html("Sign In")}`);
            }
          });
          $$renderer4.push(`<!----></form> <p class="footer-text svelte-8k30lk">Don't have an account? <a href="/register" class="svelte-8k30lk">Create one</a></p></div>`);
        }
      });
      $$renderer3.push(`<!----></div>`);
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
//# sourceMappingURL=_page.svelte-BcuwA4Or.js.map
