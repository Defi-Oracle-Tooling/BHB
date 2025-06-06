# BHB

Welcome to the BHB project repository. This document provides an overview of the project's purpose, architecture, and usage guidelines. For further details, please refer to the additional documentation in this repository.

---

## 🚀 Usage & Deployment of Advanced Features

### 1. **Automated Indexing & Management**

- Use the Express API (`scripts/api.js`) to trigger, schedule, and manage repo indexing jobs.
- Indexing jobs are enqueued to Azure Service Bus and processed asynchronously by `scripts/queue_worker.js`.
- All summaries, tags, embeddings, and logs are stored in MongoDB for historical access, analytics, and semantic search.

### 2. **API Endpoints**

- `POST /index` — Enqueue a new indexing job (optionally for a specific org).
- `GET /index.json` — Retrieve the latest index from MongoDB.
- `GET /errors` — Retrieve recent error logs from MongoDB.
- `POST /webhook` — GitHub webhook trigger for event-driven indexing.
- `POST /create-repo` — Create a new GitHub repository.
- `GET /audit-permissions/:org/:repo` — Audit repo collaborators.
- `POST /upload-index` — Upload index files to Azure Blob Storage.
- `POST /semantic-search` — Semantic search for relevant repos by natural language query.
- `GET /docs` — Interactive OpenAPI/Swagger documentation.

### 3. **Semantic Search Usage**

- **Endpoint:** `POST /semantic-search`
- **Body:** `{ "query": "your search text", "top": 5, "org": "optional-org", "language": "optional-language", "tags": ["optional", "tags"] }`
- **Returns:** Top N most relevant repos (summaries, tags, links) based on semantic similarity and optional filters.
- **Example:**

  ```bash
  curl -X POST http://localhost:3000/semantic-search \
    -H "x-api-key: <your-key>" \
    -H "Content-Type: application/json" \
    -d '{"query": "machine learning pipeline", "top": 3, "org": "my-org", "tags": ["ml"]}'
  ```

### 4. **Backfilling Embeddings**

- To ensure all existing repos are searchable, run:

  ```bash
  node scripts/backfill_embeddings.js
  ```

- This script will generate and store embeddings for any repo missing them in MongoDB.

### 5. **Vector Database (Scalable Search)**

- For large-scale or high-performance search, **Azure Cognitive Search** is fully integrated.
- The indexing pipeline upserts embeddings and metadata into the Azure Cognitive Search index.
- The semantic search endpoint uses Azure Cognitive Search’s vector similarity for fast, scalable results.
- To ensure all data is up-to-date for Azure Cognitive Search, run:

  ```bash
  node scripts/upsert_azure_search.js
  ```

- You can also integrate with Pinecone or MongoDB Atlas Search by adapting the upsert/search logic in the pipeline.

### 6. **Advanced Query Handling**

- The semantic search endpoint supports filtering by org, language, and tags.
- Results are scored and sorted by semantic similarity using Atlas Search.

### 7. **Monitoring & Analytics**

- All search queries and results are logged for analytics and improvement.
- Add metrics for search latency, embedding generation, and API usage as needed.

### 8. **Extensibility & Documentation**

- See `/docs` endpoint for live API docs.
- See `README_API.md` for detailed API and deployment instructions.
- Add more usage examples and document the embedding model and search logic as needed.

---

**Get started:**

1. Install dependencies: `pnpm install`
2. Configure `.env` with your secrets and connection strings.
3. Start the API: `pnpm start` or `node scripts/api.js`
4. Start the queue worker: `pnpm worker` or `node scripts/queue_worker.js`
5. (Optional) Backfill embeddings: `node scripts/backfill_embeddings.js`
6. (Optional) Upsert for Atlas Search: `node scripts/upsert_atlas_vector_schema.js`
7. Access API docs at `http://localhost:3000/docs`

**Available scripts in `package.json`:**

- `pnpm start` — Start the API server
- `pnpm worker` — Start the queue worker
- `pnpm dev` — Start the API server with auto-reload (requires `nodemon`)
- `pnpm lint` — Lint the codebase (requires `eslint`)
- `pnpm test` — Run tests (placeholder)
- `pnpm build` — Build step (placeholder)

For cloud deployment, build and run the Docker image, and use the Bicep template to provision Azure resources.
