import { useMemo } from 'react';
import type { Project } from '../invention-service/types.js';
import s from './ui.module.css';

const KIND_COLOR: Record<string, string> = {
  algorithm: '#8ab4ff',
  material: '#f59e66',
  device: '#6ee7b7',
  method: '#c4a5ff',
  concept: '#f5c542',
};
const TYPE_COLOR: Record<string, string> = { not_observed_in_sample: '#6ee7b7', limited_sample_overlap: '#f5c542', higher_sample_overlap: '#4b5263' };

/** Stage 3 — the connection network and ranked list of combinations. */
export function ConnectStage({ project }: { project: Project }) {
  const nodes = useMemo(() => {
    const ids = new Set(project.connections.flatMap((c) => [c.aId, c.bId]));
    const comps = project.components.filter((c) => ids.has(c.id));
    const W = 760;
    const H = 460;
    return comps.map((c, i) => {
      const angle = (i / comps.length) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 180 : 140;
      return { ...c, x: W / 2 + Math.cos(angle) * r * 1.45, y: H / 2 + Math.sin(angle) * r };
    });
  }, [project]);
  const pos = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className={s.stack}>
      <div className={s.card} style={{ padding: '0.75rem' }}>
        <svg viewBox="0 0 760 460" className={s.network} role="img" aria-label="Retrieved-sample association network">
          {project.connections.map((c) => {
            const a = pos.get(c.aId);
            const b = pos.get(c.bId);
            if (!a || !b) return null;
            return (
              <line key={c.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={TYPE_COLOR[c.type]} strokeOpacity={0.25 + c.score * 0.6}
                strokeWidth={1 + c.score * 2.5} strokeDasharray={c.type === 'not_observed_in_sample' ? '5 4' : undefined} />
            );
          })}
          {nodes.map((n) => (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={6 + Math.min(8, n.mentions)} fill={KIND_COLOR[n.kind]} fillOpacity={0.9} stroke="#0b0d12" strokeWidth={2} />
              <text x={n.x} y={n.y - 14 - Math.min(8, n.mentions)} textAnchor="middle" fontSize="11" fill="#c3c8d4">
                {n.name.length > 26 ? `${n.name.slice(0, 26)}…` : n.name}
              </text>
            </g>
          ))}
        </svg>
        <div className={s.row} style={{ marginTop: '0.6rem', padding: '0 0.4rem' }}>
          <span className={`${s.chip} ${s.t_unexplored}`}>- - not observed in sample</span>
          <span className={`${s.chip} ${s.t_emerging}`}>— limited sample overlap</span>
          <span className={`${s.chip} ${s.t_established}`}>— higher sample overlap</span>
        </div>
      </div>

      <div className={s.card}>
        <h2 className={s.h2}>Retrieved-sample associations</h2><p className={s.muted}>Scores and co-occurrence labels describe only this retrieved sample. They do not prove novelty, compatibility, or effectiveness.</p>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr><th>Combination</th><th>Sample label</th><th>Heuristic score</th><th>Why</th></tr>
            </thead>
            <tbody>
              {project.connections.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.aName}</b> × <b>{c.bName}</b>{c.crossDomain && <div><span className={s.chip}>cross-domain</span></div>}</td>
                  <td><span className={`${s.chip} ${(c.type === 'not_observed_in_sample' ? s.t_unexplored : c.type === 'limited_sample_overlap' ? s.t_emerging : s.t_established)}`}>{c.type === 'unexplored' ? 'not observed in sample' : c.type === 'emerging' ? 'limited sample overlap' : 'higher sample overlap'}</span></td>
                  <td style={{ minWidth: 90 }}>
                    <div className={s.bar}><div className={s.barFill} style={{ width: `${c.score * 100}%` }} /></div>
                    <span className={s.muted}>{c.score.toFixed(2)}</span>
                  </td>
                  <td className={s.muted}>{c.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
