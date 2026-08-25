import { Octokit } from "@octokit/rest";
import fs from "node:fs/promises";
import path from "node:path";

const owner = "pman369";
const repo = "Stateos-mvp";
const branch = "main";
const message = "feat: scaffold initial StateOS MVP core engines and session lifecycle";
const root = process.cwd();
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN is required.");

const octokit = new Octokit({ auth: token });
const files = [
  "package.json", "tsconfig.json", ".env.example", ".github/workflows/ci.yml",
  "packages/core/package.json", "packages/core/src/types/state.ts", "packages/core/src/types/protocol.ts",
  "packages/core/src/engines/StateEngine.ts", "packages/core/src/engines/ProtocolEngine.ts", "packages/core/src/engines/LearningEngine.ts", "packages/core/src/index.ts",
  "apps/web/package.json", "apps/web/app/page.tsx", "apps/web/app/layout.tsx", "apps/web/app/globals.css", "apps/web/api/session.ts", "apps/web/components/StateSession.tsx",
  "tests/core.test.ts"
];

async function sha256File(file) {
  const data = await fs.readFile(path.join(root, file));
  const hash = await import("node:crypto").then(({ createHash }) => createHash("sha1").update(data).digest("hex"));
  return { path: file, data, hash };
}

const { data: readmeData } = await sha256File("README.md");
const all = [{ path: "README.md", data: readmeData }, ...await Promise.all(files.map(sha256File))];
const base = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
const parentSha = base.data.object.sha;
const parentCommit = await octokit.rest.git.getCommit({ owner, repo, commit_sha: parentSha });
const treeEntries = [];
for (const file of all) {
  const blob = await octokit.rest.git.createBlob({ owner, repo, content: file.data.toString("base64"), encoding: "base64" });
  treeEntries.push({ path: file.path, mode: "100644", type: "blob", sha: blob.data.sha });
}
const tree = await octokit.rest.git.createTree({ owner, repo, base_tree: parentCommit.data.tree.sha, tree: treeEntries });
const commit = await octokit.rest.git.createCommit({ owner, repo, message, tree: tree.data.sha, parents: [parentSha] });
await octokit.rest.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: commit.data.sha });
console.log(`Created ${all.length} files in ${owner}/${repo}@${branch}`);
console.log(`Commit: ${commit.data.sha}`);
