import { randomUUID } from 'node:crypto';
import type { Evaluation, ExperimentParams, ExperimentResult, Invention, Project } from './types.js';
import { DEFAULT_LENSES, discover } from './discover.js';
import { understand } from './understand.js';
import { connect } from './connect.js';
import { invent, inventCustom } from './invent.js';
import { runExperiment } from './experiment.js';
import { evaluate } from './evaluate.js';
import { buildExportPackage, designSpec } from './export-package.js';
import { ProjectRepository } from './project-repository.js';

/**
 * Daisy's invention engine. Orchestrates the seven stages:
 * Discover → Understand → Connect → Invent → Experiment → Evaluate → Export.
 */
export class InventionService {
  constructor(private repo: ProjectRepository) {}

  /** List saved research projects. */
  list() {
    return this.repo.list();
  }

  /** Get a project by id. */
  get(id: string) {
    return this.repo.get(id);
  }

  /** Delete a project. */
  remove(id: string) {
    return this.repo.remove(id);
  }

  /**
   * Start a new research project. Returns immediately; the pipeline runs in the background
   * and progress is persisted so clients can poll.
   * @param query - technology, problem or goal
   * @param domains - adjacent domains to cross-pollinate (defaults applied when empty)
   */
  async start(query: string, domains?: string[]): Promise<Project> {
    const now = new Date().toISOString();
    const project: Project = {
      id: randomUUID().slice(0, 8),
      query: query.trim(),
      domains: (domains?.length ? domains : DEFAULT_LENSES).map((d) => d.trim()).filter(Boolean).slice(0, 5),
      status: 'running',
      stage: 'discover',
      log: [],
      discoveries: [],
      components: [],
      connections: [],
      inventions: [],
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.save(project);
    this.runPipeline(project).catch(async (e) => {
      project.status = 'error';
      project.error = e.message;
      project.log.push(`Error: ${e.message}`);
      await this.repo.save(project);
    });
    return project;
  }

  private async runPipeline(p: Project) {
    const log = (m: string) => p.log.push(`${new Date().toISOString().slice(11, 19)} ${m}`);

    log(`Discover: searching OpenAlex + arXiv for "${p.query}" and ${p.domains.length} adjacent domains`);
    await this.repo.save(p);
    p.discoveries = await discover(p.query, p.domains, log);
    if (!p.discoveries.length) throw new Error('No sources found — try a broader query.');
    p.stage = 'understand';
    await this.repo.save(p);

    p.components = understand(p.discoveries, p.query);
    log(`Understand: extracted ${p.components.length} technical components`);
    p.stage = 'connect';
    await this.repo.save(p);

    p.connections = connect(p.components, p.discoveries);
    log(`Connect: ranked ${p.connections.length} candidate connections (${p.connections.filter((c) => c.type === 'unexplored').length} unexplored)`);
    p.stage = 'invent';
    await this.repo.save(p);

    p.inventions = invent(p.query, p.components, p.connections, p.discoveries);
    log(`Invent: generated ${p.inventions.length} engineering designs`);

    for (const inv of p.inventions) inv.experiments.push(runExperiment(inv, { trials: 2000, baselineNoise: 3 }));
    log('Experiment: ran a 2,000-trial baseline simulation for every design');

    p.stage = 'ready';
    p.status = 'ready';
    log('Ready: evaluate and export');
    await this.repo.save(p);
  }

  /**
   * Create a custom invention from selected component ids.
   * @param projectId - project id
   * @param componentIds - 2–4 component ids
   */
  async inventFrom(projectId: string, componentIds: string[]): Promise<Invention> {
    const p = await this.require(projectId);
    const parts = p.components.filter((c) => componentIds.includes(c.id));
    if (parts.length < 2) throw new Error('Select at least 2 components');
    const inv = inventCustom(p.query, parts.slice(0, 4), p.connections, p.discoveries);
    inv.experiments.push(runExperiment(inv, { trials: 2000, baselineNoise: 3 }));
    p.inventions = [inv, ...p.inventions.filter((i) => i.id !== inv.id)];
    await this.repo.save(p);
    return inv;
  }

  /**
   * Run another experiment with custom parameters.
   * @param projectId - project id
   * @param inventionId - invention id
   * @param params - trial count and baseline noise
   */
  async experiment(projectId: string, inventionId: string, params: ExperimentParams): Promise<ExperimentResult> {
    const p = await this.require(projectId);
    const inv = p.inventions.find((i) => i.id === inventionId);
    if (!inv) throw new Error('Invention not found');
    const result = runExperiment(inv, params, inv.experiments.length);
    inv.experiments.push(result);
    await this.repo.save(p);
    return result;
  }

  /** Evaluate all inventions against the baseline. */
  async evaluate(projectId: string): Promise<Evaluation> {
    return evaluate(await this.require(projectId));
  }

  /** Markdown spec of one invention. */
  async spec(projectId: string, inventionId: string): Promise<string> {
    const p = await this.require(projectId);
    const inv = p.inventions.find((i) => i.id === inventionId);
    if (!inv) throw new Error('Invention not found');
    return designSpec(p, inv);
  }

  /**
   * Build the zip integration package.
   * @param projectId - project id
   * @param inventionIds - optional subset of inventions
   */
  async exportPackage(projectId: string, inventionIds?: string[]): Promise<{ name: string; data: Buffer }> {
    const p = await this.require(projectId);
    const data = await buildExportPackage(p, evaluate(p), inventionIds);
    return { name: `daisy-${p.query.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.zip`, data };
  }

  private async require(id: string): Promise<Project> {
    const p = await this.repo.get(id);
    if (!p) throw new Error('Project not found');
    return p;
  }

  /** Create an instance backed by the given repository (in-memory by default). */
  static from(repo: ProjectRepository = new ProjectRepository(false)) {
    return new InventionService(repo);
  }
}
