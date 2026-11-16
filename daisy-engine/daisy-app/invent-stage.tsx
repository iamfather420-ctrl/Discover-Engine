import type { Project } from '@agatenft/daisy-engine.invention-service';
import { api } from './api.js';
import s from './ui.module.css';

/** Stage 4 — generated engineering designs are hypotheses, not validated results. */
export function InventStage({ project, onTest }: { project: Project; onTest: (inventionId: string) => void }) {
  const byId = new Map(project.discoveries.map((d) => [d.id, d]));
  return (
    <div className={s.stack}>
      {project.inventions.map((inv) => (
        <article key={inv.id} className={s.card}>
          <div className={s.row} style={{ marginBottom: '0.4rem' }}>
            <span className={s.chip}>candidate connection</span>
            {inv.crossDomain && <span className={s.chip}>cross-domain candidate</span>}
            {inv.custom && <span className={s.chip}>custom design</span>}
          </div>
          <h2 className={s.h2}>{inv.title}</h2>
          <p className={s.muted}>{inv.summary}</p>
          <div className={s.card}>
            <b>Hypothesis — not established</b>
            <p>{inv.hypothesis}</p>
          </div>
          <div className={s.grid2}>
            <div><h3 className={s.h3}>Proposed mechanism</h3><ol className={s.list}>{inv.mechanism.map((m) => <li key={m}>{m}</li>)}</ol></div>
            <div><h3 className={s.h3}>Risks</h3><ul className={s.list}>{inv.risks.map((r) => <li key={r}>{r}</li>)}</ul></div>
          </div>
          <div style={{ marginTop: '0.9rem' }}>
            <h3 className={s.h3}>Research leads — claims not independently verified</h3>
            <ul className={s.list}>
              {inv.sourceIds.map((id) => {
                const d = byId.get(id);
                return d ? <li key={id}><a className={s.link} href={d.url} target="_blank" rel="noreferrer">{d.title}</a> <span className={s.muted}>({d.sourceVerification || 'unverified'}; {d.sourceVerificationDetail || 'not checked'})</span></li> : null;
              })}
            </ul>
          </div>
          <div className={s.row} style={{ marginTop: '1rem' }}>
            <a className={s.ghost} href={api.specUrl(project.id, inv.id)} target="_blank" rel="noreferrer">View design spec</a>
          </div>
        </article>
      ))}
    </div>
  );
}
