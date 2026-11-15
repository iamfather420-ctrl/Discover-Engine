import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from './api.js';
import { useProject } from './use-project.js';
import { STAGES, isStageAvailable } from './stages.js';
import type { StageKey } from './stages.js';
import { DiscoverStage } from './discover-stage.js';
import { UnderstandStage } from './understand-stage.js';
import { ConnectStage } from './connect-stage.js';
import { InventStage } from './invent-stage.js';
import { ExperimentStage } from './experiment-stage.js';
import { EvaluateStage } from './evaluate-stage.js';
import { ExportStage } from './export-stage.js';
import s from './ui.module.css';

const PROGRESS: Record<string, number> = { discover: 10, understand: 45, connect: 65, invent: 85, ready: 100 };

/** Project workbench: walks through the seven stages for one research run. */
export function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, error, reload } = useProject(id);
  const [stage, setStage] = useState<StageKey>('discover');
  const [testId, setTestId] = useState<string>();

  if (error) return <div className={s.error}>{error} — <Link className={s.link} to="/">back home</Link></div>;
  if (!project) return <div className={s.empty}>Loading project…</div>;

  const remove = async () => {
    if (!window.confirm('Delete this project?')) return;
    await api.deleteProject(project.id);
    navigate('/');
  };

  return (
    <>
      <div className={s.between} style={{ alignItems: 'flex-end' }}>
        <div>
          <Link to="/" className={s.link} style={{ fontSize: '0.85rem' }}>← All research</Link>
          <h1 className={s.h1} style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', marginBottom: '0.3rem' }}>{project.query}</h1>
          <div className={s.muted}>Adjacent domains: {project.domains.join(' · ')}</div>
        </div>
        <button className={s.ghost} onClick={remove}>Delete</button>
      </div>

      {project.status !== 'ready' && (
        <div className={s.card} style={{ marginTop: '1.25rem' }}>
          <div className={s.between} style={{ marginBottom: '0.6rem' }}>
            <b>{project.status === 'error' ? 'Pipeline failed' : `Running: ${project.stage}…`}</b>
            <span className={s.muted}>{PROGRESS[project.stage] ?? 0}%</span>
          </div>
          <div className={s.progress}><div className={s.progressBar} style={{ width: `${PROGRESS[project.stage] ?? 0}%` }} /></div>
          {project.error && <div className={s.error} style={{ marginTop: '0.75rem' }}>{project.error}</div>}
          <div className={s.log} style={{ marginTop: '0.75rem' }}>{project.log.join('\n') || 'Starting…'}</div>
        </div>
      )}

      <nav className={s.stages} aria-label="Stages">
        {STAGES.map((st, i) => {
          const available = isStageAvailable(st.key, project.stage);
          return (
            <button key={st.key} disabled={!available} onClick={() => setStage(st.key)}
              className={`${s.stage} ${stage === st.key ? s.stageActive : available ? s.stageDone : ''}`} aria-current={stage === st.key}>
              <span className={s.stageNum}>{i + 1}</span>{st.label}
            </button>
          );
        })}
      </nav>

      {!isStageAvailable(stage, project.stage) ? (
        <div className={s.empty}>This stage will unlock when the pipeline reaches it.</div>
      ) : stage === 'discover' ? (
        <DiscoverStage project={project} />
      ) : stage === 'understand' ? (
        <UnderstandStage project={project} onInvented={() => { reload(); setStage('invent'); }} />
      ) : stage === 'connect' ? (
        <ConnectStage project={project} />
      ) : stage === 'invent' ? (
        <InventStage project={project} onTest={(invId) => { setTestId(invId); setStage('experiment'); }} />
      ) : stage === 'experiment' ? (
        <ExperimentStage project={project} initialId={testId} onChange={reload} />
      ) : stage === 'evaluate' ? (
        <EvaluateStage project={project} />
      ) : (
        <ExportStage project={project} />
      )}

      {project.status === 'ready' && (
        <details style={{ marginTop: '2rem' }}>
          <summary className={s.muted} style={{ cursor: 'pointer' }}>Pipeline log</summary>
          <div className={s.log} style={{ marginTop: '0.5rem' }}>{project.log.join('\n')}</div>
        </details>
      )}
    </>
  );
}
