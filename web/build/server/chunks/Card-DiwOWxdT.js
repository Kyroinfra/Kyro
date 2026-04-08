import { d as attr_class, f as stringify } from './renderer-DLnxqfrv.js';

/* empty css                                   */
function Card($$renderer, $$props) {
  let { variant = "default", padding = "md", children } = $$props;
  $$renderer.push(`<div${attr_class(`card card-${stringify(variant)} padding-${stringify(padding)}`, "svelte-7d5xe5")}>`);
  children($$renderer);
  $$renderer.push(`<!----></div>`);
}

export { Card as C };
//# sourceMappingURL=Card-DiwOWxdT.js.map
