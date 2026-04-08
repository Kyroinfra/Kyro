import { f as attr, a as attr_class, s as stringify } from "./renderer.js";
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
export {
  Button as B
};
