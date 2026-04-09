import { f as attr_class, h as stringify, j as escape_html, r as bind_props } from './renderer-DMNwzsJT.js';

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
      $$renderer2.push(`<div class="modal-backdrop svelte-32v57s" role="dialog" aria-modal="true"><div class="modal svelte-32v57s"><header class="modal-header svelte-32v57s"><h2 class="svelte-32v57s">${escape_html(title)}</h2> <button class="close-btn svelte-32v57s" aria-label="Close"><span>✕</span></button></header> <div class="modal-body svelte-32v57s">`);
      children($$renderer2);
      $$renderer2.push(`<!----></div></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { open });
  });
}

export { Badge as B, Modal as M };
//# sourceMappingURL=Modal-BZDSGHcl.js.map
