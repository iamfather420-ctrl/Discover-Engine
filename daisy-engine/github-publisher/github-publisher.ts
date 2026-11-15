import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

/** A file to publish, with its path inside the repository. */
export interface PublishFile {
  path: string;
  content: Buffer;
}

/** Options for a publish run. */
export interface PublishOptions {
  owner: string;
  repo: string;
  token: string;
  message: string;
  files: PublishFile[];
  /** Target branch; defaults to the repo's default branch. */
  branch?: string;
}

/** Outcome of a publish run. */
export interface PublishResult {
  branch: string;
  commitSha: string;
  commitUrl: string;
  fileCount: number;
}

/** Directory and file names never published. */
const IGNORED = new Set(['node_modules', 'dist', '.bit', '.tmp', '.repos', '.git', 'AGENTS.md', '.mcp.json', 'pnpm-lock.yaml']);

/**
 * Publishes a set of files to a GitHub repository as a single commit,
 * using the Git Data API (blobs → tree → commit → ref). Works for binary files too.
 */
export class GithubPublisher {
  /**
   * Recursively collect files under `root` for the given entries, skipping build output and local state.
   * @param root - workspace root on disk
   * @param entries - relative paths (files or folders) to include
   * @returns files with repo-relative POSIX paths
   */
  async collect(root: string, entries: string[]): Promise<PublishFile[]> {
    const out: PublishFile[] = [];
    const walk = async (abs: string) => {
      const name = abs.split(sep).pop() || '';
      if (IGNORED.has(name)) return;
      const info = await stat(abs).catch(() => null);
      if (!info) return;
      if (info.isDirectory()) {
        for (const child of await readdir(abs)) await walk(join(abs, child));
        return;
      }
      out.push({ path: relative(root, abs).split(sep).join('/'), content: await readFile(abs) });
    };
    for (const entry of entries) await walk(join(root, entry));
    return out;
  }

  /**
   * Upload files as one commit on top of the branch head (existing files not in the set are kept).
   * @param opts - repository, token, message and files
   * @returns commit details
   */
  async publish(opts: PublishOptions): Promise<PublishResult> {
    const api = async (path: string, init?: { method?: string; body?: unknown }) => {
      const res = await fetch(`https://api.github.com/repos/${opts.owner}/${opts.repo}${path}`, {
        method: init?.method || 'GET',
        headers: {
          Authorization: `Bearer ${opts.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'daisy-github-publisher',
          'Content-Type': 'application/json',
        },
        body: init?.body ? JSON.stringify(init.body) : undefined,
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`GitHub ${init?.method || 'GET'} ${path} → ${res.status}: ${json.message || 'error'}`);
      return json;
    };

    const repoInfo = await api('');
    const branch = opts.branch || repoInfo.default_branch;
    const ref = await api(`/git/ref/heads/${branch}`);
    const parentSha = ref.object.sha;
    const parent = await api(`/git/commits/${parentSha}`);

    const tree: { path: string; mode: string; type: string; sha: string }[] = [];
    for (const f of opts.files) {
      const blob = await api('/git/blobs', { method: 'POST', body: { content: f.content.toString('base64'), encoding: 'base64' } });
      tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }

    const newTree = await api('/git/trees', { method: 'POST', body: { base_tree: parent.tree.sha, tree } });
    const commit = await api('/git/commits', { method: 'POST', body: { message: opts.message, tree: newTree.sha, parents: [parentSha] } });
    await api(`/git/refs/heads/${branch}`, { method: 'PATCH', body: { sha: commit.sha } });

    return { branch, commitSha: commit.sha, commitUrl: commit.html_url, fileCount: opts.files.length };
  }

  /** Create a new publisher. */
  static from() {
    return new GithubPublisher();
  }
}
