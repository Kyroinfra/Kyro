import { f as attr_class, h as stringify } from './renderer-DMNwzsJT.js';

/* empty css                                   */
function Card($$renderer, $$props) {
  let { variant = "default", padding = "md", children } = $$props;
  $$renderer.push(`<div${attr_class(`card card-${stringify(variant)} padding-${stringify(padding)}`, "svelte-7d5xe5")}>`);
  children($$renderer);
  $$renderer.push(`<!----></div>`);
}

export { Card as C };
//# sourceMappingURL=Card-Bm2Np101.js.map
