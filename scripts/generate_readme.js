import { AzureOpenAI } from "openai";
import fs from "fs/promises";
import dotenv from "dotenv";

dotenv.config({ path: '../.env' });

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "model-router";
const modelName = process.env.AZURE_OPENAI_MODEL || "model-router";
const sampleFile = process.argv[2] || "repo_sample.txt";
const outputFile = process.argv[3] || "README.md";

if (!endpoint || !apiKey) {
  console.error("Missing required environment variables. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in your .env file.");
  process.exit(1);
}

const options = { endpoint, apiKey, deployment, apiVersion };
const client = new AzureOpenAI(options);

async function main() {
  const sample = await fs.readFile(sampleFile, "utf-8");
  const response = await client.chat.completions.create({
    messages: [
      { role: "system", content: "You are a helpful assistant that writes concise, informative README.md files for GitHub repositories." },
      { role: "user", content: "Review the following files and their content, and generate a README.md that summarizes the project, its purpose, and usage.\n\n" + sample }
    ],
    max_tokens: 2048,
    temperature: 0.7,
    top_p: 0.95,
    frequency_penalty: 0,
    presence_penalty: 0,
    model: modelName
  });

  if (response?.error !== undefined && response.status !== "200") {
    throw response.error;
  }
  await fs.writeFile(outputFile, response.choices[0].message.content);
  console.log(`README.md generated and saved to ${outputFile}`);
}

main().catch((err) => {
  console.error("The sample encountered an error:", err);
  process.exit(1);
});
