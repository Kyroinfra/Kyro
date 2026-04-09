import { r as request } from './client-DJm-nEfN.js';

async function register(data) {
  return request("/api/v1/auth/register", {
    method: "POST",
    body: data
  });
}
async function login(data) {
  return request("/api/v1/auth/login", {
    method: "POST",
    body: data
  });
}

export { login as l, register as r };
//# sourceMappingURL=auth2-5vmrMwFg.js.map
