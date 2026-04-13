import swaggerJsdoc from 'swagger-jsdoc';
// import { OpenAPIV3_1 } from 'openapi-types';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Kyro API',
      version: '1.0.0',
      description: `Language-agnostic API platform for file storage and management.

## Authentication
Kyro supports two authentication methods:

### Bearer Token (JWT)
For dashboard/API management operations:
\`Authorization: Bearer <jwt_token>\`

### API Key
For file operations:
\`X-API-Key: kyro_live_<key>\`

## Base URL
- Production: \`https://api.kyro.io/api/v1\`
- Development: \`http://localhost:3000/api/v1\`

## Response Format

### Success Response
\`\`\`json
{ "data": { ... } }
\`\`\`

### Error Response
\`\`\`json
{ "error": { "message": "...", "code": "...", "details": [...] } }
\`\`\`

## Rate Limiting
- 100 requests per minute per API key
- Returns \`429 Too Many Requests\` when exceeded`,
      contact: {
        name: 'Kyro Support',
        url: 'https://kyro.io'
      },
      license: {
        name: 'Proprietary'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development'
      },
      {
        url: 'https://api.kyro.io/api/v1',
        description: 'Production'
      }
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
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from `/auth/login` or `/auth/register`. Include in Authorization header: `Bearer <token>`'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key with `kyro_live_` prefix. Obtained from `/keys` endpoint. Required for file operations.'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string', description: 'Human-readable error message' },
                code: { type: 'string', description: 'Machine-readable error code' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      path: { type: 'string' }
                    }
                  }
                }
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
            plan: { type: 'string', enum: ['free', 'pro', 'enterprise'], default: 'free' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        ApiKey: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            key_prefix: { type: 'string', description: 'First 16 characters of the key' },
            scopes: { type: 'array', items: { type: 'string', enum: ['read', 'write', 'admin'] } },
            last_used_at: { type: 'string', format: 'date-time', nullable: true },
            revoked_at: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        File: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', description: 'Original filename' },
            mimeType: { type: 'string', description: 'MIME type' },
            sizeBytes: { type: 'integer', description: 'File size in bytes' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        UsageStats: {
          type: 'object',
          properties: {
            total_requests: { type: 'integer', description: 'Total API requests' },
            total_bytes_in: { type: 'integer', description: 'Total bytes received' },
            total_bytes_out: { type: 'integer', description: 'Total bytes sent' },
            total_storage: { type: 'integer', description: 'Total storage used in bytes' },
            active_api_keys: { type: 'integer', description: 'Number of active API keys' }
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
        BadRequest: {
          description: 'Invalid request body',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        Conflict: {
          description: 'Resource already exists',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        PayloadTooLarge: {
          description: 'File too large',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        TooManyRequests: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      retryAfter: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts']
};

export const specs = swaggerJsdoc(options);

export function generateSpec() {
  return specs;
}

if (require.main === module) {
  const fs = require('fs');
  const path = require('path');

  const outputPath = path.join(__dirname, '../../openapi.yaml');

  let yamlOutput = '';

  function convertToYaml(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let result = '';

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === 'object' && item !== null) {
          result += convertToYaml(item, indent);
        } else {
          result += `${spaces}- ${item}\n`;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
          continue;
        }
        if (typeof value === 'object' && !Array.isArray(value)) {
          result += `${spaces}${key}:\n${convertToYaml(value, indent + 1)}`;
        } else if (Array.isArray(value)) {
          result += `${spaces}${key}:\n`;
          for (const item of value) {
            if (typeof item === 'object') {
              result += `${spaces}  - ${JSON.stringify(item).replace(/["{}]/g, '').replace(/,/g, '\n    ').replace(/:/g, ': ')}\n`;
            } else {
              result += `${spaces}  - ${value}\n`;
            }
          }
        } else {
          result += `${spaces}${key}: ${JSON.stringify(value)}\n`;
        }
      }
    }
    return result;
  }

  console.log('Generating OpenAPI spec...');
  console.log(JSON.stringify(specs, null, 2));
}
