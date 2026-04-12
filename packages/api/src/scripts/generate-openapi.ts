import swaggerJsdoc from 'swagger-jsdoc';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Kyro API',
      version: '1.0.0',
      description: 'Language-agnostic API platform for file storage and management.',
      contact: { name: 'Kyro Support', url: 'https://kyro.io' },
      license: { name: 'Proprietary' }
    },
    servers: [
      { url: 'http://localhost:3000/api/v1', description: 'Development' },
      { url: 'https://api.kyro.io/api/v1', description: 'Production' }
    ],
    tags: [
      { name: 'Authentication', description: 'User registration and login' },
      { name: 'Organisation', description: 'Workspace management' },
      { name: 'API Keys', description: 'API key lifecycle management' },
      { name: 'Files', description: 'File upload, download, and management' },
      { name: 'Usage', description: 'Usage analytics and reporting' },
      { name: 'Health', description: 'Health check endpoints' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
                details: { type: 'array', items: { type: 'object' } }
              }
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['owner', 'admin', 'member'] },
            orgId: { type: 'string', format: 'uuid' }
          }
        },
        Organisation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            plan: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        ApiKey: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            key_prefix: { type: 'string' },
            scopes: { type: 'array', items: { type: 'string' } },
            last_used_at: { type: 'string', format: 'date-time', nullable: true },
            revoked_at: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        File: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            mimeType: { type: 'string' },
            sizeBytes: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        UsageStats: {
          type: 'object',
          properties: {
            total_requests: { type: 'integer' },
            total_bytes_in: { type: 'integer' },
            total_bytes_out: { type: 'integer' },
            total_storage: { type: 'integer' },
            active_api_keys: { type: 'integer' }
          }
        },
        Member: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['owner', 'admin', 'member'] },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      },
      responses: {
        BadRequest: { description: 'Invalid request body', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        Unauthorized: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        Forbidden: { description: 'Insufficient permissions', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        Conflict: { description: 'Resource already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        PayloadTooLarge: { description: 'File too large', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        TooManyRequests: { description: 'Rate limit exceeded', content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, retryAfter: { type: 'number' } } } } } } } }
      }
    }
  },
  apis: ['./src/routes/*.ts']
};

const specs = swaggerJsdoc(options) as {
  paths?: Record<string, unknown>;
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: Array<{ url: string; description?: string }>;
  tags?: Array<{ name: string; description?: string }>;
  components?: Record<string, unknown>;
};

const outputDir = path.join(__dirname, '../../../shared/openapi/');
const jsonPath = path.join(outputDir, 'openapi-generated.json');
const yamlPath = path.join(outputDir, 'openapi-generated.yaml');

fs.writeFileSync(jsonPath, JSON.stringify(specs, null, 2));
fs.writeFileSync(yamlPath, yaml.stringify(specs));

const pathsCount = Object.keys(specs.paths || {}).length;

console.log(`✅ OpenAPI spec generated:`);
console.log(`   - JSON: ${jsonPath}`);
console.log(`   - YAML: ${yamlPath}`);
console.log(`   - Paths: ${pathsCount}`);
