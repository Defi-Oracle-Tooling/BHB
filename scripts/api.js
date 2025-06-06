import { AzureOpenAI } from "openai";
import { getLatestIndex } from "./db.js";
// --- SEMANTIC SEARCH WITH AZURE COGNITIVE SEARCH ---
import { SearchClient, AzureKeyCredential } from "@azure/search-documents";

// --- SEMANTIC SEARCH ENDPOINT ---
import { getDb } from "./db.js";
app.post("/semantic-search", async (req, res) => {
  try {
    const { query, top = 5, org, language, tags } = req.body;
    if (!query) return res.status(400).json({ error: "Missing query" });
    const results = await azureSemanticSearch(query, top, org, language, tags);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

async function azureSemanticSearch(query, top = 5, org, language, tags) {
  const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const apiKey = process.env.AZURE_SEARCH_API_KEY;
  const indexName = process.env.AZURE_SEARCH_INDEX_NAME || "repo-index";
  if (!endpoint || !apiKey) throw new Error("Azure Cognitive Search not configured");
  const client = new SearchClient(endpoint, indexName, new AzureKeyCredential(apiKey));
  // Build filter string
  let filter = [];
  if (org) filter.push(`org eq '${org}'`);
  if (language) filter.push(`primaryLanguage eq '${language}'`);
  if (tags && Array.isArray(tags) && tags.length > 0) {
    filter.push(tags.map(t => `tags/any(x: x eq '${t}')`).join(' and '));
  }
  const filterStr = filter.length ? filter.join(' and ') : undefined;
  // Use vector search
  const embedding = await getQueryEmbedding(query);
  const results = await client.search("", {
    top,
    vector: {
      value: embedding,
      kNearestNeighborsCount: top,
      fields: "embedding"
    },
    filter: filterStr
  });
  const items = [];
  for await (const result of results.results) {
    items.push(result.document);
  }
  return items;
}

// Helper to get embedding for a query
async function getQueryEmbedding(query) {
  const client = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || "model-router",
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview"
  });
  const embeddingResp = await client.embeddings.create({
    input: query,
    model: process.env.AZURE_OPENAI_EMBEDDING_MODEL || "text-embedding-ada-002"
  });
  return embeddingResp.data[0].embedding;
}

// --- RATE LIMITING ---
import rateLimit from "express-rate-limit";
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
}));
// --- SWAGGER DOCS ---
import { swaggerUiServe, swaggerUiSetup } from "./swagger.js";
app.use("/docs", swaggerUiServe, swaggerUiSetup);
// Express.js API wrapper for modular repo indexer
import express from "express";
import { ServiceBusClient } from "@azure/service-bus";
// --- MESSAGE QUEUE: Enqueue indexing job instead of running directly ---
async function enqueueIndexingJob(org = null) {
  const connectionString = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING;
  const queueName = process.env.AZURE_SERVICE_BUS_QUEUE || "repo-index-jobs";
  if (!connectionString) throw new Error("Missing AZURE_SERVICE_BUS_CONNECTION_STRING");
  const sbClient = new ServiceBusClient(connectionString);
  const sender = sbClient.createSender(queueName);
  await sender.sendMessages({ body: { org } });
  await sender.close();
  await sbClient.close();
}
import dotenv from "dotenv";
import { runIndexingJob, getIndex, getErrors, uploadIndexesToBlob } from "./repo_indexer.js";
import { getLatestIndex, getErrorLogs } from "./db.js";
import fs from "fs/promises";

dotenv.config({ path: '../.env' });

import cron from "node-cron";
import { BlobServiceClient } from "@azure/storage-blob";

const app = express();
app.use(express.json());

// --- SCHEDULER: Run indexing job every day at 2am UTC (configurable via env) ---
const cronSchedule = process.env.CRON_SCHEDULE || "0 2 * * *";
let scheduledJob = null;
if (process.env.ENABLE_SCHEDULER === "true") {
  scheduledJob = cron.schedule(cronSchedule, async () => {
    console.log("[Scheduler] Running daily repo indexing job...");
    try {
      await runIndexingJob();
      console.log("[Scheduler] Indexing job completed.");
    } catch (err) {
      console.error("[Scheduler] Indexing job failed:", err);
    }
  }, { timezone: "UTC" });
  console.log(`[Scheduler] Scheduled job enabled: ${cronSchedule} UTC`);
}

// --- WEBHOOK: GitHub event trigger endpoint ---
app.post("/webhook", async (req, res) => {
  // Optionally validate GitHub signature here
  try {
    const event = req.headers['x-github-event'];
    if (event === "repository" || event === "push") {
      await runIndexingJob();
      res.json({ status: "indexing triggered" });
    } else {
      res.json({ status: "ignored", event });
    }
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// Simple API key check middleware
app.use((req, res, next) => {
  const apiKey = process.env.API_KEY;
  if (apiKey && req.headers["x-api-key"] !== apiKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});
// --- GITHUB MANAGEMENT: Create repo endpoint ---
app.post("/create-repo", async (req, res) => {
  try {
    const { org, name, private: isPrivate = true } = req.body;
    if (!org || !name) return res.status(400).json({ error: "org and name required" });
    const cmd = `gh repo create ${org}/${name} --${isPrivate ? "private" : "public"} --confirm`;
    const { execSync } = await import("child_process");
    execSync(cmd);
    res.json({ status: "created", repo: `${org}/${name}` });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// --- GITHUB MANAGEMENT: Permission audit endpoint ---
app.get("/audit-permissions/:org/:repo", async (req, res) => {
  try {
    const { org, repo } = req.params;
    const { execSync } = await import("child_process");
    const collaborators = execSync(`gh api repos/${org}/${repo}/collaborators`).toString();
    res.json({ org, repo, collaborators: JSON.parse(collaborators) });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// --- CLOUD STORAGE: Upload index to Azure Blob Storage ---
app.post("/upload-index", async (req, res) => {
  try {
    const result = await uploadIndexesToBlob();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// Trigger indexing job (enqueue to Service Bus)
app.post("/index", async (req, res) => {
  try {
    const { org } = req.body;
    await enqueueIndexingJob(org);
    res.json({ status: "enqueued", org: org || "ALL" });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// Get latest index (JSON, from MongoDB)
app.get("/index.json", async (req, res) => {
  try {
    const data = await getLatestIndex();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// Get latest index (Markdown)
app.get("/index.md", async (req, res) => {
  try {
    const data = await fs.readFile("repo_index.md", "utf-8");
    res.type("text/markdown").send(data);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// Get error logs (from MongoDB)
app.get("/errors", async (req, res) => {
  try {
    const logs = await getErrorLogs(10);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Repo indexer API running on port ${port}`);
});
