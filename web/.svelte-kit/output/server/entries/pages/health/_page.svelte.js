import "clsx";
import { a as attr_class, s as stringify } from "../../../chunks/renderer.js";
function Spinner($$renderer, $$props) {
  let { size = "md" } = $$props;
  $$renderer.push(`<div${attr_class(`spinner spinner-${stringify(size)}`, "svelte-7uvg3c")}></div>`);
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="health-page svelte-3hm2cj"><header class="page-header svelte-3hm2cj"><h1 class="svelte-3hm2cj">System Health</h1> <p class="subtitle svelte-3hm2cj">Backend connection status</p></header> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="loading svelte-3hm2cj">`);
      Spinner($$renderer2, { size: "lg" });
      $$renderer2.push(`<!----> <p>Checking backend status...</p></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
