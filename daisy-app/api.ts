import type { Evaluation, ExperimentResult, Invention, Project } from '../invention-service/types.js';

/** Base URL of the invention service (through the platform gateway). */
export const API_BASE: string = (import.meta as any).env?.VITE_API_URL || '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Project summary used in lists. */
export type ProjectSummary = Pick<Project, 'id' | 'query' | 'domains' | 'status' | 'stage' | 'createdAt'>;

/** Typed client for Daisy's invention engine. */
export const api = {
  listProjects: () => request<ProjectSummary[]>('/projects'),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  createProject: (query: string, domains: string[]) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify({ query, domains }) }),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
  inventFrom: (id: string, componentIds: string[]) =>
    request<Invention>(`/projects/${id}/inventions`, { method: 'POST', body: JSON.stringify({ componentIds }) }),
  runExperiment: (id: string, inv: string, trials: number, baselineNoise: number) =>
    request<ExperimentResult>(`/projects/${id}/inventions/${inv}/experiments`, {
      method: 'POST',
      body: JSON.stringify({ trials, baselineNoise }),
    }),
  evaluate: (id: string) => request<Evaluation>(`/projects/${id}/evaluation`),
  specUrl: (id: string, inv: string) => `${API_BASE}/projects/${id}/inventions/${inv}/spec`,
  exportUrl: (id: string, inventionIds?: string[]) =>
    `${API_BASE}/projects/${id}/export${inventionIds?.length ? `?inventions=${inventionIds.join(',')}` : ''}`,
};
