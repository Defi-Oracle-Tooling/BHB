# Repo Indexer API & Automation

This project provides robust, modular, and cloud-ready automation for reviewing, summarizing, and managing all GitHub repositories owned by a user or organization. It leverages Azure OpenAI for LLM-powered summaries and tags, and is ready for integration with ABSOLUTE REALMS DIGITAL CLOUD or stand-alone use.

## Features
- **Automated Indexing**: Summarizes and tags all repos using Azure OpenAI.
- **Scheduler**: (Optional) Periodic indexing via cron (configurable, see `.env`).
- **Webhook**: GitHub event endpoint to trigger indexing on repo changes.
- **API Endpoints**:
  - `POST /index` — Trigger indexing job (optionally for a specific org)
  - `GET /index.json` — Get latest index (JSON)
  - `GET /index.md` — Get latest index (Markdown)
  - `GET /errors` — Get error log
  - `POST /webhook` — GitHub webhook trigger
  - `POST /create-repo` — Create a new repo (org/name)
  - `GET /audit-permissions/:org/:repo` — List repo collaborators
  - `POST /upload-index` — Upload index files to Azure Blob Storage
- **Cloud Storage**: Uploads index and logs to Azure Blob Storage for persistent, cloud-native storage.
- **Secrets & Config**: All secrets and config in `.env` (never hardcoded).
- **Error Handling**: Robust logging and error management.

## Usage

### 1. Install dependencies
```
npm install
```

### 2. Configure `.env`
```
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_DEPLOYMENT=model-router
AZURE_OPENAI_MODEL=model-router
API_KEY=your_api_key_here
ENABLE_SCHEDULER=true
CRON_SCHEDULE=0 2 * * *
AZURE_BLOB_CONNECTION_STRING=...
AZURE_BLOB_CONTAINER=repo-index
```

### 3. Run the API server
```
node scripts/api.js
```

### 4. (Optional) Set up GitHub webhook
- Point your GitHub repo/org webhook to `/webhook` endpoint.

### 5. (Optional) Use the scheduler
- Set `ENABLE_SCHEDULER=true` in `.env` to enable daily automated indexing.

### 6. (Optional) Upload indexes to Azure Blob Storage
- Call `POST /upload-index` after indexing completes.

## Deployment (ABSOLUTE REALMS DIGITAL CLOUD)
- Deploy as a Node.js service/container.
- Ensure `.env` is securely provided (use cloud secrets manager if available).
- Expose API endpoints as needed.
- Use cloud-native scheduler or message queue for large-scale/event-driven workflows.

## Extending
- Add more endpoints for advanced GitHub management (issues, PRs, etc).
- Integrate with message queues for event-driven processing.
- Add persistent DB for historical indexes if needed.

## Security
- All endpoints require `x-api-key` header (except webhook, which should be IP/GitHub restricted).
- Never commit secrets.

---

For more, see code in `scripts/` and comments in each file.
