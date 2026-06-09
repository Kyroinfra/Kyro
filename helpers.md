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
