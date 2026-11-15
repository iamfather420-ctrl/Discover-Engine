import { useMemo, useState } from 'react';
import type { Project } from '../invention-service/types.js';
import s from './ui.module.css';

/** Stage 1 — the sources Daisy found, filterable by lens. */
export function DiscoverStage({ project }: { project: Project }) {
  const lenses = useMemo(() => ['all', ...new Set(project.discoveries.map((d) => d.lens))], [project.discoveries]);
  const [lens, setLens] = useState('all');
  const items = project.discoveries.filter((d) => lens === 'all' || d.lens === lens);

  return (
    <div className={s.stack}>
      <div className={s.between}>
        <p className={s.muted} style={{ margin: 0 }}>
          {project.discoveries.length} sources from OpenAlex and arXiv · core query plus {project.domains.length} adjacent lenses
        </p>
        <div className={s.row}>
          {lenses.map((l) => (
            <button key={l} className={`${s.chipToggle} ${lens === l ? s.chipOn : ''}`} onClick={() => setLens(l)}>
              {l} {l !== 'all' && `(${project.discoveries.filter((d) => d.lens === l).length})`}
            </button>
          ))}
        </div>
      </div>
      <div className={s.grid}>
        {items.map((d) => (
          <article key={d.id} className={s.card}>
            <div className={s.row} style={{ marginBottom: '0.5rem' }}>
              <span className={s.chip}>{d.source === 'arxiv' ? 'arXiv' : 'OpenAlex'}</span>
              <span className={s.chip}>{d.lens}</span>
              {d.year && <span className={s.muted}>{d.year}</span>}
              {d.citations > 0 && <span className={s.muted}>· {d.citations} cites</span>}
            </div>
            <h3 className={s.h3}>
              <a className={s.link} href={d.url} target="_blank" rel="noreferrer">{d.title}</a>
            </h3>
            <div className={s.muted} style={{ marginBottom: '0.4rem' }}>{d.field}</div>
            <p className={`${s.muted} ${s.clamp3}`} style={{ margin: 0 }}>{d.abstract}</p>
            {d.metrics.length > 0 && (
              <div className={s.row} style={{ marginTop: '0.6rem' }}>
                {d.metrics.slice(0, 2).map((m) => (
                  <span key={m} className={`${s.chip} ${s.kind_device}`} title="Extracted benchmark">📊 {m.length > 60 ? `${m.slice(0, 60)}…` : m}</span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
