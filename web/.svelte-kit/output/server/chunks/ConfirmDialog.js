import { b as escape_html, a as attr_class, j as bind_props, s as stringify } from "./renderer.js";
function ConfirmDialog($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      open = void 0,
      title,
      message,
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
      variant = "danger",
      onconfirm,
      oncancel
    } = $$props;
    if (open) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="dialog-backdrop svelte-193t4hn" role="dialog" aria-modal="true" tabindex="-1"><div class="dialog svelte-193t4hn"><h3 class="dialog-title svelte-193t4hn">${escape_html(title)}</h3> <p class="dialog-message svelte-193t4hn">${escape_html(message)}</p> <div class="actions svelte-193t4hn"><button class="btn-cancel svelte-193t4hn">${escape_html(cancelLabel)}</button> <button${attr_class(`btn-confirm btn-${stringify(variant)}`, "svelte-193t4hn")}>${escape_html(confirmLabel)}</button></div></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { open });
  });
}
export {
  ConfirmDialog as C
};
