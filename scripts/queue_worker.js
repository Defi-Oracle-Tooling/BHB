// Azure Service Bus queue worker for repo indexing jobs
import { ServiceBusClient } from "@azure/service-bus";
import dotenv from "dotenv";
import { runIndexingJob } from "./repo_indexer.js";

dotenv.config({ path: '../.env' });

const connectionString = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING;
const queueName = process.env.AZURE_SERVICE_BUS_QUEUE || "repo-index-jobs";

if (!connectionString) {
  console.error("Missing AZURE_SERVICE_BUS_CONNECTION_STRING in .env");
  process.exit(1);
}

async function main() {
  const sbClient = new ServiceBusClient(connectionString);
  const receiver = sbClient.createReceiver(queueName);
  console.log(`[Worker] Listening for jobs on queue: ${queueName}`);
  receiver.subscribe({
    async processMessage(msg) {
      try {
        const { org } = msg.body;
        console.log(`[Worker] Processing indexing job for org: ${org || 'ALL'}`);
        await runIndexingJob(org);
        console.log(`[Worker] Indexing job complete for org: ${org || 'ALL'}`);
      } catch (err) {
        console.error(`[Worker] Error processing job:`, err);
      }
    },
    async processError(err) {
      console.error(`[Worker] Service Bus error:`, err);
    }
  });
}

main().catch(console.error);
