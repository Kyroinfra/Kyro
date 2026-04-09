import { b as escape_html, d as derived, c as store_get, u as unsubscribe_stores } from "../../chunks/renderer.js";
import { p as page } from "../../chunks/stores.js";
import { B as Button } from "../../chunks/Button.js";
function _error($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const status = derived(() => store_get($$store_subs ??= {}, "$page", page).status);
    const error = derived(() => store_get($$store_subs ??= {}, "$page", page).error);
    $$renderer2.push(`<div class="error-page svelte-1j96wlh"><div class="error-content svelte-1j96wlh"><h1 class="error-code svelte-1j96wlh">${escape_html(status())}</h1> <p class="error-message svelte-1j96wlh">${escape_html(error()?.message ?? "An error occurred")}</p> <p class="error-description svelte-1j96wlh">`);
    if (status() === 404) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`The page you're looking for doesn't exist.`);
    } else if (status() === 403) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`You don't have permission to access this resource.`);
    } else if (status() === 500) {
      $$renderer2.push("<!--[2-->");
      $$renderer2.push(`Something went wrong on our end. Please try again later.`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`An unexpected error occurred.`);
    }
    $$renderer2.push(`<!--]--></p> <div class="error-actions svelte-1j96wlh">`);
    Button($$renderer2, {
      onclick: () => window.history.back(),
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->Go Back`);
      }
    });
    $$renderer2.push(`<!----> `);
    Button($$renderer2, {
      variant: "secondary",
      onclick: () => window.location.href = "/",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->Go Home`);
      }
    });
    $$renderer2.push(`<!----></div></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _error as default
};
