import { useEffect, useState } from 'react';
import type { Evaluation, Project } from '@agatenft/daisy-engine.invention-service';
import { api } from './api.js';
import s from './ui.module.css';

const COLS = ['feasibility', 'impact', 'evidence', 'risk'] as const;

/** Stage 6 — displays evidence status without manufacturing numeric scores. */
export function EvaluateStage({ project }: { project: Project }) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.evaluate(project.id).then(setEvaluation).catch((e) => setError(e.message));
  }, [project.id]);
  if (error) return <div className={s.error}>{error}</div>;
  if (!evaluation) return <div className={s.empty}>Loading evidence status…</div>;
  return (
    <div className={s.stack}>
      <section className={s.card}>
        <h2 className={s.h2}>Evidence assessment</h2>
        <p className={s.muted}>Numeric rankings are withheld until measured evidence and a measured baseline are available.</p>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>Design</th>{COLS.map(c => <th key={c}>{c}</th>)}<th>Overall</th><th>Status</th></tr></thead>
            <tbody>{evaluation.rows.map(r => <tr key={r.id}>
              <td>{r.title}</td>
              {COLS.map(c => <td key={c}>Not established</td>)}
              <td>Not established</td><td>{r.evidenceStatus}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className={s.card}>
        <h2 className={s.h2}>Literature leads — abstract extracts unverified</h2>
        {evaluation.benchmarks.length === 0 ? <p className={s.muted}>No eligible core-source extracts were found.</p> :
          <ul className={s.list}>{evaluation.benchmarks.map(b => <li key={b.claim + b.source}>“{b.claim}” — <a className={s.link} href={b.url} target="_blank" rel="noreferrer">{b.source}</a></li>)}</ul>}
      </section>
    </div>
  );
}
