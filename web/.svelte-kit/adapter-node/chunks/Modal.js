import { a as attr_class, s as stringify, b as escape_html, j as bind_props } from "./renderer.js";
/* empty css                                    */
function Badge($$renderer, $$props) {
  let { variant = "default", size = "sm", children } = $$props;
  $$renderer.push(`<span${attr_class(`badge badge-${stringify(variant)} badge-${stringify(size)}`, "svelte-16wd81y")}>`);
  children($$renderer);
  $$renderer.push(`<!----></span>`);
}
function Modal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { open = void 0, title, onclose, children } = $$props;
    if (open) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="modal-backdrop svelte-32v57s" role="dialog" aria-modal="true"><div class="modal svelte-32v57s"><header class="modal-header svelte-32v57s"><h2 class="modal-title svelte-32v57s">${escape_html(title)}</h2> <button class="close-btn svelte-32v57s" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></header> <div class="modal-body svelte-32v57s">`);
      children($$renderer2);
      $$renderer2.push(`<!----></div></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { open });
  });
}
export {
  Badge as B,
  Modal as M
};
