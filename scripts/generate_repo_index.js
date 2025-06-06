// Robust repo indexer with LLM summarization, error handling, concurrency, metadata, and Markdown/JSON output
import { AzureOpenAI } from "openai";
import fs from "fs/promises";
import dotenv from "dotenv";
import { execSync } from "child_process";

dotenv.config({ path: '../.env' });

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "model-router";
const modelName = process.env.AZURE_OPENAI_MODEL || "model-router";
const MAX_PARALLEL = 3;
const MAX_FILES = 5;
const MAX_SAMPLE_LINES = 20;
const ERROR_LOG = "repo_index_errors.log";
const HUMAN_INDEX = "repo_index.md";
const JSON_INDEX = "repo_index.json";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function logError(msg) {
  return fs.appendFile(ERROR_LOG, `[${new Date().toISOString()}] ${msg}\n`);
}

function standardizeTags(tags) {
  return tags.map(t => t.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_#]/g, ''));
}

async function getRepoList(filterOrg = null) {
  const orgs = execSync('gh api user/orgs --jq \'\.[].login\'').toString().trim().split(/\r?\n/);
  let repos = [];
  for (const org of orgs) {
    if (filterOrg && org !== filterOrg) continue;
    const repoNames = execSync(`gh repo list ${org} --limit 1000 --json name,primaryLanguage,updatedAt,licenseInfo,url -q '[.[] | {name,primaryLanguage,updatedAt,licenseInfo,url}]'`).toString();
    const repoObjs = JSON.parse(repoNames);
    for (const repo of repoObjs) {
      repos.push({ org, ...repo });
    }
  }
  return repos;
}

async function getSampleForRepo(org, repo) {
  let files;
  try {
    files = execSync(`gh api repos/${org}/${repo}/contents | jq -r '.[].name'`).toString().trim().split(/\r?\n/);
  } catch {
    return null;
  }
  let sample = '';
  let count = 0;
  for (const file of files) {
    if (file.toLowerCase() === 'readme.md') continue;
    sample += `--- ${file} ---\n`;
    try {
      const content = execSync(`gh api repos/${org}/${repo}/contents/${file} | jq -r '.content' | base64 --decode | head -${MAX_SAMPLE_LINES}`).toString();
      sample += content + '\n';
    } catch {}
    count++;
    if (count >= MAX_FILES) break;
  }
  return sample;
}

async function callLLM(sample) {
  const client = new AzureOpenAI({ endpoint, apiKey, deployment, apiVersion });
  const response = await client.chat.completions.create({
    messages: [
      { role: "system", content: "You are a helpful assistant that creates a concise summary and relevant #tags for a GitHub repository, based on file samples. Output in JSON: {summary: string, tags: string[]}" },
      { role: "user", content: `Review the following files and their content, and generate a summary and relevant #tags for this repository.\n\n${sample}` }
    ],
    max_tokens: 512,
    temperature: 0.5,
    top_p: 0.95,
    frequency_penalty: 0,
    presence_penalty: 0,
    model: modelName
  });
  let summary = "";
  let tags = [];
  try {
    const llmJson = JSON.parse(response.choices[0].message.content);
    summary = llmJson.summary;
    tags = Array.isArray(llmJson.tags) ? standardizeTags(llmJson.tags) : [];
  } catch {
    summary = response.choices[0].message.content;
    tags = [];
  }
  return { summary, tags };
}

async function processRepo(repo) {
  const { org, name, primaryLanguage, updatedAt, licenseInfo, url } = repo;
  try {
    const sample = await getSampleForRepo(org, name);
    if (!sample) {
      await logError(`Failed to get sample for ${org}/${name}`);
      return null;
    }
    const { summary, tags } = await callLLM(sample);
    return {
      org,
      repo: name,
      summary,
      tags,
      primaryLanguage: primaryLanguage ? primaryLanguage.name : null,
      updatedAt,
      license: licenseInfo ? licenseInfo.spdxId : null,
      url,
      indexedAt: new Date().toISOString()
    };
  } catch (err) {
    await logError(`LLM or processing error for ${org}/${name}: ${err}`);
    return null;
  }
}

async function writeIndexes(index) {
  // Write JSON index
  await fs.writeFile(JSON_INDEX, JSON.stringify(index, null, 2));
  // Write Markdown index
  let humanIndex = `# Repository Index\n\nGenerated: ${new Date().toISOString()}\n\n`;
  for (const entry of index) {
    humanIndex += `## [${entry.org}/${entry.repo}](${entry.url})\n`;
    humanIndex += `- **Summary:** ${entry.summary}\n`;
    humanIndex += `- **Tags:** ${entry.tags.map(t => `#${t}`).join(' ')}\n`;
    if (entry.primaryLanguage) humanIndex += `- **Language:** ${entry.primaryLanguage}\n`;
    if (entry.license) humanIndex += `- **License:** ${entry.license}\n`;
    if (entry.updatedAt) humanIndex += `- **Last Updated:** ${entry.updatedAt}\n`;
    humanIndex += `- **Indexed At:** ${entry.indexedAt}\n`;
    humanIndex += `\n`;
  }
  await fs.writeFile(HUMAN_INDEX, humanIndex);
}

async function main() {
  await fs.writeFile(ERROR_LOG, "");
  const repos = await getRepoList();
  let index = [];
  let i = 0;
  while (i < repos.length) {
    const batch = repos.slice(i, i + MAX_PARALLEL);
    const results = await Promise.all(batch.map(processRepo));
    for (const entry of results) {
      if (entry) index.push(entry);
    }
    i += MAX_PARALLEL;
    await sleep(2000); // avoid rate limits
  }
  await writeIndexes(index);
  console.log(`Repository index written to ${JSON_INDEX} and ${HUMAN_INDEX}`);
  if ((await fs.readFile(ERROR_LOG, "utf-8")).trim().length > 0) {
    console.log(`Some errors occurred. See ${ERROR_LOG}`);
  }
}

main().catch(async (err) => {
  await logError(`Fatal error: ${err}`);
  console.error("The sample encountered an error:", err);
  process.exit(1);
});
