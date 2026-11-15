import { useEffect, useState } from 'react';
import type { Evaluation, Project } from '../invention-service/types.js';
import { api } from './api.js';
import s from './ui.module.css';

const COLS = ['feasibility', 'impact', 'evidence', 'risk'] as const;

/** Stage 6 — compare designs against the current best practice and literature benchmarks. */
export function EvaluateStage({ project }: { project: Project }) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.evaluate(project.id).then(setEvaluation).catch((e) => setError(e.message));
  }, [project]);

  if (error) return <div className={s.error}>{error}</div>;
  if (!evaluation) return <div className={s.empty}>Scoring designs…</div>;

  return (
    <div className={s.stack}>
      <div className={s.card}>
        <div className={s.between}>
          <h2 className={s.h2}>Scorecard vs. baseline</h2>
          <span className={s.muted}>
            Overall = {Object.entries(evaluation.weights).map(([k, v]) => `${k} ${k === 'risk' ? '−' : ''}${v}`).join(' · ')}
          </span>
        </div>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr><th>#</th><th>Design</th>{COLS.map((c) => <th key={c}>{c}</th>)}<th>Overall</th><th>Experiment</th></tr>
            </thead>
            <tbody>
              {evaluation.rows.map((r, i) => (
                <tr key={r.id} className={r.isBaseline ? s.baselineRow : undefined}>
                  <td>{r.isBaseline ? '—' : i}</td>
                  <td style={{ minWidth: 200 }}>{r.title}</td>
                  {COLS.map((c) => (
                    <td key={c} style={{ minWidth: 70 }}>
                      <div className={s.bar}><div className={s.barFill} style={{ width: `${r[c] * 10}%`, background: c === 'risk' ? '#ff8080' : undefined }} /></div>
                      <span className={s.muted}>{r[c]}</span>
                    </td>
                  ))}
                  <td><b style={{ fontSize: '1.1rem' }}>{r.overall}</b></td>
                  <td>{r.experimentVerdict ? <span className={`${s.chip} ${s[`v_${r.experimentVerdict}`]}`}>{r.experimentVerdict}</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={s.card}>
        <h2 className={s.h2}>Literature benchmarks</h2>
        {evaluation.benchmarks.length === 0 ? (
          <p className={s.muted}>No quantitative claims were found in the core sources.</p>
        ) : (
          <ul className={s.list}>
            {evaluation.benchmarks.map((b) => (
              <li key={b.claim + b.source}>“{b.claim}” — <a className={s.link} href={b.url} target="_blank" rel="noreferrer">{b.source}</a></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
