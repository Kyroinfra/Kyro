import { a9 as head } from "../../../../chunks/renderer.js";
import { B as Button } from "../../../../chunks/Button.js";
import { I as Input } from "../../../../chunks/Input.js";
import { C as Card } from "../../../../chunks/Card.js";
function _page($$renderer) {
  let email = "";
  let password = "";
  let loading = false;
  let $$settled = true;
  let $$inner_renderer;
  function $$render_inner($$renderer2) {
    head("8k30lk", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Sign In - Kyro</title>`);
      });
    });
    $$renderer2.push(`<div class="auth-page svelte-8k30lk"><div class="auth-header svelte-8k30lk"><a href="/" class="logo svelte-8k30lk"><span class="logo-icon svelte-8k30lk">K</span> <span class="logo-text">Kyro</span></a></div> `);
    Card($$renderer2, {
      padding: "lg",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="auth-form svelte-8k30lk"><h1 class="svelte-8k30lk">Welcome back</h1> <p class="subtitle svelte-8k30lk">Sign in to your account</p> <form method="POST" class="svelte-8k30lk">`);
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
            $$renderer4.push(`<!---->Sign In`);
          }
        });
        $$renderer3.push(`<!----></form> <p class="footer-text svelte-8k30lk">Don't have an account? <a href="/register" class="svelte-8k30lk">Create one</a></p></div>`);
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
