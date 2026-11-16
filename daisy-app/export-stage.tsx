import { useState } from 'react';
import type { Project } from '../invention-service/types.js';
import { api } from './api.js';
import s from './ui.module.css';

/** Stage 7 — download the integration package. */
export function ExportStage({ project }: { project: Project }) {
  const [selected, setSelected] = useState<string[]>(project.inventions.map((i) => i.id));
  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <div className={s.grid2} style={{ alignItems: 'start' }}>
      <div className={s.card}>
        <h2 className={s.h2}>Choose designs to package</h2>
        <div className={s.stack} style={{ gap: '0.5rem' }}>
          {project.inventions.map((inv) => (
            <label key={inv.id} className={s.row} style={{ minHeight: 44, cursor: 'pointer' }}>
              <input type="checkbox" checked={selected.includes(inv.id)} onChange={() => toggle(inv.id)} style={{ width: 20, height: 20 }} />
              <span>{inv.title}</span>
            </label>
          ))}
        </div>
        <div className={s.row} style={{ marginTop: '1rem' }}>
          <a className={s.primary} href={selected.length ? api.exportUrl(project.id, selected) : undefined} aria-disabled={!selected.length}
            style={!selected.length ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
            ⬇ Download package (.zip)
          </a>
        </div>
      </div>
      <div className={s.card}>
        <h2 className={s.h2}>What's inside</h2>
        <ul className={s.list}>
          <li><b>README.md</b> — overview, evidence status and integration snippet</li>
          <li><b>EVALUATION.md</b> — evidence status and unverified literature leads; no unsupported numeric scorecard</li>
          <li><b>inventions/&lt;name&gt;/DESIGN.md</b> — spec, mechanism, risks, hypothesis status and validation requirements, evidence</li>
          <li><b>inventions/&lt;name&gt;/prototype.ts</b> — runnable design scaffold only</li>
          <li><b>inventions/&lt;name&gt;/invention.json</b> — machine-readable design</li>
          <li><b>data/</b> — raw discoveries, components and connections</li>
        </ul>
      </div>
    </div>
  );
}
