import { c as ensure_array_like, d as attr_class, f as stringify, h as escape_html } from './renderer-CXmutz4z.js';
import { w as writable } from './index-_aXIFmlh.js';

let toastId = 0;
function createToastStore() {
  const { subscribe, update } = writable([]);
  function addToast(type, message, duration = 5e3) {
    const id = ++toastId;
    update((toasts) => [...toasts, { id, type, message }]);
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }
  function removeToast(id) {
    update((toasts) => toasts.filter((t) => t.id !== id));
  }
  return {
    subscribe,
    success: (message, duration) => addToast("success", message, duration),
    error: (message, duration) => addToast("error", message, duration),
    warning: (message, duration) => addToast("warning", message, duration),
    info: (message, duration) => addToast("info", message, duration),
    remove: removeToast
  };
}
const toast = createToastStore();
function Toast($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let toasts = [];
    toast.subscribe((value) => {
      toasts = value;
    });
    function getIcon(type) {
      switch (type) {
        case "success":
          return "✓";
        case "error":
          return "✕";
        case "warning":
          return "⚠";
        case "info":
          return "ℹ";
      }
    }
    if (toasts.length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="toast-container svelte-zemmny"><!--[-->`);
      const each_array = ensure_array_like(toasts);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let t = each_array[$$index];
        $$renderer2.push(`<div${attr_class(`toast toast-${stringify(t.type)}`, "svelte-zemmny")}><span class="icon svelte-zemmny">${escape_html(getIcon(t.type))}</span> <span class="message svelte-zemmny">${escape_html(t.message)}</span> <button class="close svelte-zemmny">✕</button></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function _layout($$renderer, $$props) {
  let { children } = $$props;
  Toast($$renderer);
  $$renderer.push(`<!----> <main class="svelte-12qhfyh">`);
  children($$renderer);
  $$renderer.push(`<!----></main>`);
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte-C2QLimPk.js.map
