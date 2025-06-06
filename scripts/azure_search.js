// Azure Cognitive Search integration for upserting and searching repo embeddings
import { SearchClient, AzureKeyCredential } from "@azure/search-documents";

const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
const apiKey = process.env.AZURE_SEARCH_API_KEY;
const indexName = process.env.AZURE_SEARCH_INDEX || "repo-index";

export function getSearchClient() {
  if (!endpoint || !apiKey) throw new Error("Missing Azure Cognitive Search endpoint or API key");
  return new SearchClient(endpoint, indexName, new AzureKeyCredential(apiKey));
}

export async function upsertRepoToSearch(doc) {
  const client = getSearchClient();
  // doc must include: id, org, repo, summary, tags, embedding, etc.
  await client.mergeOrUploadDocuments([doc]);
}

export async function searchReposByVector(queryEmbedding, top = 5, filters = {}) {
  const client = getSearchClient();
  // Azure Search vector search API
  const vectorQuery = {
    vector: {
      value: queryEmbedding,
      kNearestNeighborsCount: top,
      fields: "embedding"
    },
    filter: buildFilter(filters)
  };
  const results = await client.search("", vectorQuery);
  const hits = [];
  for await (const result of results.results) {
    hits.push(result.document);
  }
  return hits;
}

function buildFilter(filters) {
  // Example: { org: "my-org", language: "js", tags: ["ml"] }
  const clauses = [];
  if (filters.org) clauses.push(`org eq '${filters.org}'`);
  if (filters.language) clauses.push(`primaryLanguage eq '${filters.language}'`);
  if (filters.tags && filters.tags.length)
    clauses.push(`tags/any(t: search.in(t, '${filters.tags.join(",")}'))`);
  return clauses.length ? clauses.join(" and ") : undefined;
}
