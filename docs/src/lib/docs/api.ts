import { openapiSpec } from "./spec";

export interface Prop {
  type?: string;
  format?: string;
  description?: string;
  enum?: string[];
  items?: Prop;
  default?: unknown;
}

interface Schema {
  required?: string[];
  properties?: Record<string, Prop>;
  additionalProperties?: unknown;
}

interface Param {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: Prop;
}

export interface Operation {
  summary?: string;
  description?: string;
  tags?: string[];
  security?: Array<Record<string, string[]>>;
  parameters?: Param[];
  requestBody?: { content?: Record<string, { schema?: Schema }> };
  responses?: Record<string, { description?: string }>;
  "x-scope"?: string;
  "x-response-example"?: string;
}

export interface Endpoint {
  id: string;
  method: string;
  path: string;
  op: Operation;
}

export interface Group {
  id: string;
  label: string;
  description: string;
  endpoints: Endpoint[];
}

export interface Row {
  name: string;
  type: string;
  required: boolean;
  description: string;
  extra: string;
}

export interface Body {
  contentType: string;
  form: boolean;
  free: boolean;
  rows: Row[];
  sample: unknown;
}

export const spec = openapiSpec as unknown as {
  openapi: string;
  info: { title: string; version: string; description: string };
  tags: { name: string; description?: string }[];
  paths: Record<string, Record<string, Operation>>;
};

const TAGS: Record<string, string> = {
  Auth: "auth",
  Organisation: "organisation",
  "API Keys": "api-keys",
  Usage: "usage",
  Webhooks: "webhooks",
  Files: "files",
  Collections: "collections",
  Search: "search",
  Ask: "ask",
  Health: "health",
};

const METHODS = ["get", "post", "put", "patch", "delete"];

const all: Group[] = Object.entries(TAGS).map(([label, id]) => ({
  id,
  label,
  description: spec.tags.find((t) => t.name === label)?.description ?? "",
  endpoints: [],
}));

for (const [path, item] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(item)) {
    if (!METHODS.includes(method)) continue;
    const group = all.find((g) => g.label === op.tags?.[0]);
    if (!group) continue;
    const slug = path.replace(/\//g, "-").replace(/[{}]/g, "");
    group.endpoints.push({
      id: `${group.id}-${method}-${slug}`,
      method: method.toUpperCase(),
      path,
      op,
    });
  }
}

export const groups = all.filter((g) => g.endpoints.length > 0);

function typeName(p: Prop): string {
  if (p.type === "array") return `${p.items ? typeName(p.items) : "any"}[]`;
  const t = p.type ?? "any";
  return p.format ? `${t} (${p.format})` : t;
}

function row(name: string, p: Prop, required: boolean, description: string): Row {
  const options = p.enum ?? p.items?.enum;
  const extra = [
    options ? `one of ${options.join(", ")}` : "",
    p.default !== undefined ? `default ${JSON.stringify(p.default)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    name,
    type: p.format === "binary" ? "file" : typeName(p),
    required,
    description,
    extra,
  };
}

function sampleValue(name: string, p: Prop): unknown {
  if (p.enum) return p.enum[0];
  if (p.default !== undefined) return p.default;
  if (p.type === "array") return p.items ? [sampleValue(name, p.items)] : [];
  if (p.type === "integer" || p.type === "number") return 1;
  if (p.type === "boolean") return true;
  if (p.format === "email") return "user@example.com";
  if (p.format === "uri") return "https://example.com/hook";
  if (p.format === "uuid") return "00000000-0000-0000-0000-000000000000";
  return name;
}

export function parseBody(op: Operation): Body | null {
  const content = op.requestBody?.content;
  if (!content) return null;
  const contentType = content["multipart/form-data"]
    ? "multipart/form-data"
    : "application/json";
  const schema = content[contentType]?.schema;
  if (!schema) return null;

  const props = schema.properties ?? {};
  const names = Object.keys(props);
  const required = schema.required ?? [];
  const free = names.length === 0 && !!schema.additionalProperties;
  const picked = required.length ? required : names.slice(0, 1);

  return {
    contentType,
    form: contentType === "multipart/form-data",
    free,
    rows: names.map((n) =>
      row(n, props[n], required.includes(n), props[n].description ?? ""),
    ),
    sample: free
      ? { key: "value" }
      : Object.fromEntries(picked.map((n) => [n, sampleValue(n, props[n])])),
  };
}

export function paramRows(op: Operation, where: "path" | "query"): Row[] {
  return (op.parameters ?? [])
    .filter((p) => p.in === where)
    .map((p) => row(p.name, p.schema ?? {}, !!p.required, p.description ?? ""));
}

export function authType(op: Operation): "bearer" | "apiKey" | "none" {
  const security = op.security ?? [];
  if (security.some((s) => "apiKey" in s)) return "apiKey";
  if (security.some((s) => "bearerAuth" in s)) return "bearer";
  return "none";
}

export function successCode(op: Operation): string | undefined {
  return Object.keys(op.responses ?? {}).find((c) => c.startsWith("2"));
}

export function formatExample(raw?: string): string {
  if (!raw) return "";
  if (raw.startsWith("Binary") || raw.startsWith("//")) return raw;
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

const ORIGIN = "http://localhost:3000";

function snippetUrl(ep: Endpoint): string {
  const base = ep.path === "/health" ? ORIGIN : `${ORIGIN}/api/v1`;
  const query = (ep.op.parameters ?? [])
    .filter((p) => p.in === "query" && p.required)
    .map((p) => {
      const value =
        p.name === "q" ? "payment terms" : String(sampleValue(p.name, p.schema ?? {}));
      return `${p.name}=${encodeURIComponent(value)}`;
    });
  const path = ep.path.replace(/\{(\w+)\}/g, ":$1");
  return base + path + (query.length ? `?${query.join("&")}` : "");
}

export function curl(ep: Endpoint): string {
  const auth = authType(ep.op);
  const body = parseBody(ep.op);
  const lines = [`curl -X ${ep.method} "${snippetUrl(ep)}"`];
  if (auth === "bearer") lines.push('-H "Authorization: Bearer $JWT_TOKEN"');
  if (auth === "apiKey") lines.push('-H "X-Api-Key: $API_KEY"');
  if (body?.form) {
    lines.push('-F "file=@./your-file.pdf"');
  } else if (body) {
    lines.push('-H "Content-Type: application/json"');
    lines.push(`-d '${JSON.stringify(body.sample)}'`);
  }
  return lines.join(" \\\n  ");
}

function readResponse(ep: Endpoint): string {
  const example = ep.op["x-response-example"] ?? "";
  if (!example) return successCode(ep.op) === "204" ? "" : "const data = await response.json();";
  if (example.startsWith("Binary")) return "const blob = await response.blob();";
  if (example.startsWith("//")) return "// SSE stream: read response.body";
  return "const data = await response.json();";
}

export function fetchSnippet(ep: Endpoint): string {
  const auth = authType(ep.op);
  const body = parseBody(ep.op);
  const headers: string[] = [];
  if (auth === "bearer") headers.push('"Authorization": "Bearer JWT_TOKEN"');
  if (auth === "apiKey") headers.push('"X-Api-Key": "API_KEY"');

  let setup = "";
  if (body?.form) {
    setup = 'const form = new FormData();\nform.append("file", file);\n\n';
  } else if (body) {
    headers.push('"Content-Type": "application/json"');
    setup = `const payload = ${JSON.stringify(body.sample, null, 2)};\n\n`;
  }

  const parts = [`method: "${ep.method}"`];
  if (headers.length) {
    parts.push(`headers: {\n${headers.map((h) => `    ${h},`).join("\n")}\n  }`);
  }
  if (body) parts.push(body.form ? "body: form" : "body: JSON.stringify(payload)");

  const read = readResponse(ep);
  const options = parts.map((p) => `  ${p},`).join("\n");
  return `${setup}const response = await fetch("${snippetUrl(ep)}", {\n${options}\n});${read ? `\n${read}` : ""}`;
}
