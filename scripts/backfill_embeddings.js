// Backfill embeddings for all repos missing them in MongoDB
import { getDb } from "./db.js";
import { AzureOpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config({ path: '../.env' });

async function main() {
  const db = await getDb();
  const col = db.collection("indexes");
  const client = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || "model-router",
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview"
  });
  const cursor = col.find({ "index.embedding": { $exists: false } });
  let count = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc || !Array.isArray(doc.index)) continue;
    for (let i = 0; i < doc.index.length; i++) {
      const entry = doc.index[i];
      if (!entry.embedding && entry.summary) {
        try {
          const embResp = await client.embeddings.create({
            input: entry.summary,
            model: process.env.AZURE_OPENAI_EMBEDDING_MODEL || "text-embedding-ada-002"
          });
          entry.embedding = embResp.data[0].embedding;
          count++;
        } catch (err) {
          console.error(`Embedding error for ${entry.org}/${entry.repo}:`, err);
        }
      }
    }
    await col.updateOne({ _id: doc._id }, { $set: { index: doc.index } });
  }
  console.log(`Backfilled embeddings for ${count} repos.`);
  process.exit(0);
}

main();
