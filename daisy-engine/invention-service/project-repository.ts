import mongoose, { Schema } from 'mongoose';
import type { Model } from 'mongoose';
import type { Project } from './types.js';

const ProjectSchema = new Schema(
  {
    _id: { type: String, required: true },
    query: String,
    domains: [String],
    status: String,
    stage: String,
    error: String,
    log: [String],
    discoveries: { type: Schema.Types.Mixed, default: [] },\n    evidenceClaims: { type: Schema.Types.Mixed, default: [] },\n    evidenceMeasurements: { type: Schema.Types.Mixed, default: [] },
    components: { type: Schema.Types.Mixed, default: [] },
    connections: { type: Schema.Types.Mixed, default: [] },
    inventions: { type: Schema.Types.Mixed, default: [] },
    createdAt: String,
    updatedAt: String,
  },
  { versionKey: false, minimize: false },
);

const ProjectModel: Model<any> =
  (mongoose.models.DaisyProject as Model<any>) || mongoose.model<any>('DaisyProject', ProjectSchema, 'daisy_projects');

function toProject(doc: any): Project {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest } as Project;
}

/** Connect to the built-in MongoDB using MONGO_URL. Falls back to memory if unavailable. */
export async function connectDb(): Promise<boolean> {
  const url = process.env.MONGO_URL;
  if (!url) return false;
  try {
    await mongoose.connect(url, { serverSelectionTimeoutMS: 5000 });
    return true;
  } catch (e: any) {
    console.error('[invention-service] MongoDB connection failed:', e.message);
    return false;
  }
}

/**
 * Persistence for research projects. All data access goes through here.
 */
export class ProjectRepository {
  private memory = new Map<string, Project>();

  constructor(private useDb: boolean) {}

  /** List projects, newest first (summary fields only). */
  async list(): Promise<Pick<Project, 'id' | 'query' | 'domains' | 'status' | 'stage' | 'createdAt'>[]> {
    if (!this.useDb) return [...this.memory.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const docs = await ProjectModel.find({}, { query: 1, domains: 1, status: 1, stage: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(50).lean();
    return docs.map(toProject);
  }

  /** Get a full project. */
  async get(id: string): Promise<Project | null> {
    if (!this.useDb) return this.memory.get(id) || null;
    const doc = await ProjectModel.findById(id).lean();
    return doc ? toProject(doc) : null;
  }

  /** Insert or replace a project. */
  async save(project: Project): Promise<Project> {
    project.updatedAt = new Date().toISOString();
    if (!this.useDb) {
      this.memory.set(project.id, project);
      return project;
    }
    const { id, ...rest } = project;
    await ProjectModel.replaceOne({ _id: id }, { _id: id, ...rest }, { upsert: true });
    return project;
  }

  /** Delete a project. */
  async remove(id: string): Promise<void> {
    if (!this.useDb) {
      this.memory.delete(id);
      return;
    }
    await ProjectModel.deleteOne({ _id: id });
  }
}
