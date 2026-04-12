// Kyro API TypeScript Types
// Generated from OpenAPI 3.1 Specification
// Do not edit manually

// ============== Auth Types ==============

export interface RegisterInput {
  email: string;
  password: string;
  orgName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  orgId: string;
}

// ============== Organisation Types ==============

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface Member {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  createdAt: string;
}

export interface InviteMemberInput {
  email: string;
  password: string;
  role?: 'owner' | 'admin' | 'member';
}

// ============== API Key Types ==============

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: ApiKeyScope[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface CreateApiKeyResponse extends ApiKey {
  key: string;
}

export type ApiKeyScope = 'read' | 'write' | 'admin';

export interface CreateKeyInput {
  name: string;
  scopes?: ApiKeyScope[];
}

// ============== File Types ==============

export interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface UploadResponse extends FileItem {}

// ============== Usage Types ==============

export interface UsageStats {
  total_requests: number;
  total_bytes_in: number;
  total_bytes_out: number;
  total_storage: number;
  active_api_keys: number;
}

export interface DailyUsage {
  date: string;
  requests: number;
  bytes_in: number;
  bytes_out: number;
}

// ============== Error Types ==============

export interface KyroError {
  error: {
    message: string;
    code?: string;
    details?: Array<{
      message: string;
      path?: string;
    }>;
  };
}

export type ErrorCode =
  | 'invalid_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'payload_too_large'
  | 'rate_limited'
  | 'internal_error';

// ============== API Response Types ==============

export type ApiResponse<T> = T | KyroError;

export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    limit: number;
    cursor?: string;
    total?: number;
  };
}

// ============== HTTP Methods ==============

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// ============== Endpoint Configuration ==============

export interface EndpointConfig {
  method: HttpMethod;
  path: string;
  auth: 'none' | 'bearer' | 'apiKey';
  scope?: ApiKeyScope;
  body?: unknown;
  response: unknown;
}

// ============== Health Types ==============

export interface HealthResponse {
  status: string;
  uptime?: number;
  test?: string;
  timestamp?: string;
  database?: string;
  redis?: string;
}

// ============== Utility Types ==============

export type MaybePromise<T> = T | Promise<T>;

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;