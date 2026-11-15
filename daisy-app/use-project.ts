import { useCallback, useEffect, useState } from 'react';
import type { Project } from '../invention-service/types.js';
import { api } from './api.js';

/**
 * Load a project and poll it every 1.5s while the pipeline is running.
 * @param id - project id
 * @returns project, error and a manual reload function
 */
export function useProject(id?: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      setProject(await api.getProject(id));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    setProject(null);
    reload();
  }, [reload]);

  useEffect(() => {
    if (project?.status !== 'running') return undefined;
    const t = setInterval(reload, 1500);
    return () => clearInterval(t);
  }, [project?.status, reload]);

  return { project, error, reload, setProject };
}
