After making edits to schema.ts don't run db:push, just run pnpm db:generate a container would be spun up to run the migration automatically

POST /ask
{
  "question": "What are the payment terms?",
  "filters": {
    "matter_number": "M-2024-001",
    "document_type": ["contract", "amendment"]
  },
  "stream": false
}

POST /ask
{
  "question": "Any known issues with login on v2.3?",
  "filters": {
    "product": "auth-service",
    "version":  "2.3"
  }
}
