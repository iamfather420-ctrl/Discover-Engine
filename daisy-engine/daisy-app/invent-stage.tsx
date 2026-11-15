import type { Project } from '@agatenft/daisy-engine.invention-service';
import { api } from './api.js';
import s from './ui.module.css';

/** Stage 4 — generated engineering designs. */
export function InventStage({ project, onTest }: { project: Project; onTest: (inventionId: string) => void }) {
  const byId = new Map(project.discoveries.map((d) => [d.id, d]));
  return (
    <div className={s.stack}>
      {project.inventions.map((inv) => {
        const last = inv.experiments[inv.experiments.length - 1];
        return (
          <article key={inv.id} className={s.card}>
            <div className={s.between} style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: '1 1 320px' }}>
                <div className={s.row} style={{ marginBottom: '0.4rem' }}>
                  <span className={`${s.chip} ${s[`t_${inv.connectionType}`]}`}>{inv.connectionType}</span>
                  {inv.crossDomain && <span className={s.chip}>cross-domain</span>}
                  {inv.custom && <span className={`${s.chip} ${s.chipOn}`}>custom</span>}
                  {last && <span className={`${s.chip} ${s[`v_${last.verdict}`]}`}>experiment: {last.verdict}</span>}
                </div>
                <h2 className={s.h2}>{inv.title}</h2>
                <p className={s.muted} style={{ marginTop: 0 }}>{inv.summary}</p>
              </div>
              <div className={s.stats} style={{ flex: '1 1 300px', maxWidth: 420 }}>
                <div className={s.stat}><span className={s.statValue}>+{inv.expectedGain}%</span><span className={s.statLabel}>Expected gain</span></div>
                <div className={s.stat}><span className={s.statValue}>±{inv.uncertainty}%</span><span className={s.statLabel}>Uncertainty</span></div>
                <div className={s.stat}><span className={s.statValue}>{inv.complexity}/5</span><span className={s.statLabel}>Complexity</span></div>
              </div>
            </div>

            <div className={s.card} style={{ background: '#0d1016', margin: '0.75rem 0' }}>
              <div className={s.statLabel} style={{ marginBottom: '0.3rem' }}>Hypothesis</div>
              <div>{inv.hypothesis}</div>
            </div>

            <div className={s.grid2}>
              <div>
                <h3 className={s.h3}>Mechanism</h3>
                <ol className={s.list}>{inv.mechanism.map((m) => <li key={m}>{m}</li>)}</ol>
              </div>
              <div>
                <h3 className={s.h3}>Risks</h3>
                <ul className={s.list}>{inv.risks.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
            </div>

            <div style={{ marginTop: '0.9rem' }}>
              <h3 className={s.h3}>Evidence</h3>
              <ul className={s.list}>
                {inv.sourceIds.slice(0, 4).map((id) => {
                  const d = byId.get(id);
                  return d ? <li key={id}><a className={s.link} href={d.url} target="_blank" rel="noreferrer">{d.title}</a> <span className={s.muted}>({d.field})</span></li> : null;
                })}
              </ul>
            </div>

            <div className={s.row} style={{ marginTop: '1rem' }}>
              <button className={s.primary} onClick={() => onTest(inv.id)}>Run experiment →</button>
              <a className={s.ghost} href={api.specUrl(project.id, inv.id)} target="_blank" rel="noreferrer">View design spec</a>
            </div>
          </article>
        );
      })}
    </div>
  );
}
