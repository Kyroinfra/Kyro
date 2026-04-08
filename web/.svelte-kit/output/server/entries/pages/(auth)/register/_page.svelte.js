import { a9 as head } from "../../../../chunks/renderer.js";
import { B as Button } from "../../../../chunks/Button.js";
import { I as Input } from "../../../../chunks/Input.js";
import { C as Card } from "../../../../chunks/Card.js";
function _page($$renderer) {
  let orgName = "";
  let email = "";
  let password = "";
  let loading = false;
  let $$settled = true;
  let $$inner_renderer;
  function $$render_inner($$renderer2) {
    head("ydeots", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Create Account - Kyro</title>`);
      });
    });
    $$renderer2.push(`<div class="auth-page svelte-ydeots"><div class="auth-header svelte-ydeots"><a href="/" class="logo svelte-ydeots"><span class="logo-icon svelte-ydeots">K</span> <span class="logo-text">Kyro</span></a></div> `);
    Card($$renderer2, {
      padding: "lg",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="auth-form svelte-ydeots"><h1 class="svelte-ydeots">Create your account</h1> <p class="subtitle svelte-ydeots">Start building with Kyro</p> <form method="POST" class="svelte-ydeots">`);
        Input($$renderer3, {
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
        $$renderer3.push(`<!----> `);
        Input($$renderer3, {
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
        $$renderer3.push(`<!----> `);
        Input($$renderer3, {
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
        $$renderer3.push(`<!----> `);
        Button($$renderer3, {
          type: "submit",
          loading,
          disabled: loading,
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Create Account`);
          }
        });
        $$renderer3.push(`<!----></form> <p class="footer-text svelte-ydeots">Already have an account? <a href="/login" class="svelte-ydeots">Sign in</a></p></div>`);
      }
    });
    $$renderer2.push(`<!----></div>`);
  }
  do {
    $$settled = true;
    $$inner_renderer = $$renderer.copy();
    $$render_inner($$inner_renderer);
  } while (!$$settled);
  $$renderer.subsume($$inner_renderer);
}
export {
  _page as default
};
