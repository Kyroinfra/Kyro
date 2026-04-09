import { h as head, b as escape_html } from "../../../../chunks/renderer.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import { B as Button } from "../../../../chunks/Button.js";
import { I as Input } from "../../../../chunks/Input.js";
import { C as Card } from "../../../../chunks/Card.js";
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
          $$renderer5.push(`<title>Create Account - Kyro</title>`);
        });
      });
      $$renderer3.push(`<div class="auth-page svelte-ydeots"><div class="auth-header svelte-ydeots"><a href="/" class="logo svelte-ydeots"><span class="logo-icon svelte-ydeots">K</span> <span class="logo-text">Kyro</span></a></div> `);
      Card($$renderer3, {
        padding: "lg",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="auth-form svelte-ydeots"><h1 class="svelte-ydeots">Create your account</h1> <p class="subtitle svelte-ydeots">Start building with Kyro</p> <form method="POST" class="svelte-ydeots">`);
          if (form?.error) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="form-error">${escape_html(form.error)}</div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> `);
          Input($$renderer4, {
            name: "orgName",
            label: "Organization Name",
            type: "text",
            placeholder: "My Company",
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
              $$renderer5.push(`<!---->${escape_html("Create Account")}`);
            }
          });
          $$renderer4.push(`<!----></form> <p class="footer-text svelte-ydeots">Already have an account? <a href="/login" class="svelte-ydeots">Sign in</a></p></div>`);
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
export {
  _page as default
};
