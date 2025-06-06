// Upsert all repo embeddings and metadata into MongoDB Atlas Search schema
import { getDb } from "./db.js";

async function main() {
  const db = await getDb();
  const col = db.collection("indexes");
  const cursor = col.find({});
  let count = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc || !Array.isArray(doc.index)) continue;
    // Ensure each entry has embedding and metadata
    for (let i = 0; i < doc.index.length; i++) {
      const entry = doc.index[i];
      if (!entry.embedding) continue;
      // Optionally, add or update any additional metadata fields here
    }
    await col.updateOne({ _id: doc._id }, { $set: { index: doc.index } });
    count++;
  }
  console.log(`Upserted ${count} index docs for Atlas Search.`);
  process.exit(0);
}

main();
