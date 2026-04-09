import { f as attr_class, h as stringify } from './renderer-DMNwzsJT.js';

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

export { _page as default };
//# sourceMappingURL=_page.svelte-DGi77RIP.js.map
