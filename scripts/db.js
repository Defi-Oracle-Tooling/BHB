// MongoDB integration for index and log storage
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: '../.env' });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "repo_index";

if (!uri) throw new Error("Missing MONGODB_URI in .env");

export async function getDb() {
  const client = new MongoClient(uri);
  await client.connect();
  return client.db(dbName);
}

export async function saveIndex(index) {
  const db = await getDb();
  const col = db.collection("indexes");
  await col.insertOne({ createdAt: new Date(), index });
}

export async function saveErrorLog(log) {
  const db = await getDb();
  const col = db.collection("logs");
  await col.insertOne({ createdAt: new Date(), log });
}

export async function getLatestIndex() {
  const db = await getDb();
  const col = db.collection("indexes");
  const doc = await col.find().sort({ createdAt: -1 }).limit(1).next();
  return doc ? doc.index : [];
}

export async function getErrorLogs(limit = 10) {
  const db = await getDb();
  const col = db.collection("logs");
  return await col.find().sort({ createdAt: -1 }).limit(limit).toArray();
}
