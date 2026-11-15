import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GithubPublisher } from './github-publisher.js';

describe('github publisher', () => {
  it('collects source files and skips build output and node_modules', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pub-'));
    await mkdir(join(root, 'src/dist'), { recursive: true });
    await mkdir(join(root, 'src/node_modules'), { recursive: true });
    await writeFile(join(root, 'src/a.ts'), 'a');
    await writeFile(join(root, 'src/dist/a.js'), 'x');
    await writeFile(join(root, 'src/node_modules/x.js'), 'x');
    const files = await GithubPublisher.from().collect(root, ['src', 'missing.txt']);
    expect(files.map((f) => f.path)).toEqual(['src/a.ts']);
  });
});
