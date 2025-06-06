// Upsert repo embeddings and metadata into Azure Cognitive Search
import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import dotenv from "dotenv";
import { getLatestIndex } from "./db.js";

dotenv.config({ path: '../.env' });

const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
const apiKey = process.env.AZURE_SEARCH_API_KEY;
const indexName = process.env.AZURE_SEARCH_INDEX_NAME || "repo-index";

if (!endpoint || !apiKey) {
  console.error("Missing Azure Cognitive Search endpoint or API key in .env");
  process.exit(1);
}

async function main() {
  const client = new SearchClient(endpoint, indexName, new AzureKeyCredential(apiKey));
  const index = await getLatestIndex();
  if (!index || !Array.isArray(index)) {
    console.error("No index data found.");
    process.exit(1);
  }
  const docs = index.filter(r => Array.isArray(r.embedding)).map(r => ({
    id: `${r.org}_${r.repo}`,
    org: r.org,
    repo: r.repo,
    summary: r.summary,
    tags: r.tags,
    embedding: r.embedding,
    primaryLanguage: r.primaryLanguage,
    updatedAt: r.updatedAt,
    license: r.license,
    url: r.url,
    indexedAt: r.indexedAt
  }));
  // Upsert in batches
  for (let i = 0; i < docs.length; i += 1000) {
    const batch = docs.slice(i, i + 1000);
    await client.mergeOrUploadDocuments(batch);
    console.log(`Upserted ${i + batch.length} / ${docs.length}`);
  }
  console.log("Upsert to Azure Cognitive Search complete.");
  process.exit(0);
}

main();
