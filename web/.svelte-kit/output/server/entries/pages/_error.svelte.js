import { n as noop, g as getContext, d as attr, a as attr_class, s as stringify, b as escape_html, f as derived, h as store_get, u as unsubscribe_stores } from "../../chunks/renderer.js";
import "clsx";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/root.js";
const is_legacy = noop.toString().includes("$$") || /function \w+\(\) \{\}/.test(noop.toString());
const placeholder_url = "a:";
if (is_legacy) {
  ({
    data: {},
    form: null,
    error: null,
    params: {},
    route: { id: null },
    state: {},
    status: -1,
    url: new URL(placeholder_url)
  });
}
const getStores = () => {
  const stores = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores.updated
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
function Button($$renderer, $$props) {
  let {
    variant = "primary",
    size = "md",
    disabled = false,
    loading = false,
    type = "button",
    onclick,
    children
  } = $$props;
  $$renderer.push(`<button${attr("type", type)}${attr("disabled", disabled, true)}${attr_class(`btn btn-${stringify(variant)} btn-${stringify(size)}`, "svelte-1xko78n", { "loading": loading })}>`);
  if (loading) {
    $$renderer.push("<!--[0-->");
    $$renderer.push(`<span class="spinner svelte-1xko78n"></span>`);
  } else {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--> <span${attr_class("content svelte-1xko78n", void 0, { "hidden": loading })}>`);
  children($$renderer);
  $$renderer.push(`<!----></span></button>`);
}
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
