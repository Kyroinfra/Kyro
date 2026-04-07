import "clsx";
import { redirect } from "@sveltejs/kit";
const load = () => {
  throw redirect(302, "/health");
};
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
  });
}
export {
  _page as default,
  load
};
