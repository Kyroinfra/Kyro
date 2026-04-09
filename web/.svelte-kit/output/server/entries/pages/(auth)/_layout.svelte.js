import "clsx";
function _layout($$renderer, $$props) {
  let { children } = $$props;
  $$renderer.push(`<div class="auth-layout svelte-5bky5h"><div class="auth-container svelte-5bky5h">`);
  children($$renderer);
  $$renderer.push(`<!----></div></div>`);
}
export {
  _layout as default
};
