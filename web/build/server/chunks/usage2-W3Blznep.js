import { r as request } from './client-DJm-nEfN.js';

async function getUsage(token) {
  return request("/api/v1/usage", { method: "GET", token });
}
async function getDailyUsage(token, startDate, endDate) {
  let url = "/api/v1/usage/daily";
  const params = new URLSearchParams();
  if (params.toString()) url += `?${params.toString()}`;
  const data = await request(url, { method: "GET", token });
  return data.map((d) => ({
    date: d.date,
    requests: parseInt(d.requests, 10),
    bytes_in: parseInt(d.bytes_in, 10),
    bytes_out: parseInt(d.bytes_out, 10)
  }));
}

export { getDailyUsage as a, getUsage as g };
//# sourceMappingURL=usage2-W3Blznep.js.map
