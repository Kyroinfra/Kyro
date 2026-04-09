import { b as escape_html, f as attr, a as attr_class, j as bind_props } from "./renderer.js";
function Input($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      name,
      label,
      type = "text",
      placeholder = "",
      value = "",
      error,
      disabled = false,
      required = false,
      oninput,
      onchange
    } = $$props;
    $$renderer2.push(`<div class="input-wrapper svelte-138axrz">`);
    if (label) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<label class="label svelte-138axrz">${escape_html(label)} `);
      if (required) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="required svelte-138axrz">*</span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></label>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <input${attr("name", name)}${attr("type", type)}${attr("placeholder", placeholder)}${attr("value", value)}${attr("disabled", disabled, true)}${attr("required", required, true)}${attr_class("input svelte-138axrz", void 0, { "error": !!error })}/> `);
    if (error) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="error-text svelte-138axrz">${escape_html(error)}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
    bind_props($$props, { value });
  });
}
export {
  Input as I
};
