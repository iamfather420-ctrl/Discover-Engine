import { useState } from 'react';
import type { Invention, Project } from '../invention-service/types.js';
import { api } from './api.js';
import s from './ui.module.css';

/**
 * Stage 2 — technical components extracted from the sources.
 * Users can select 2–4 and ask Daisy to invent with them.
 */
export function UnderstandStage({ project, onInvented }: { project: Project; onInvented: (inv: Invention) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kinds = ['algorithm', 'material', 'device', 'method', 'concept'];

  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 4 ? cur : [...cur, id]));

  const inventSelected = async () => {
    setBusy(true);
    setError(null);
    try {
      onInvented(await api.inventFrom(project.id, selected));
      setSelected([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.stack}>
      <div className={s.between}>
        <div className={s.row}>
          {kinds.map((k) => (
            <span key={k} className={`${s.chip} ${s[`kind_${k}`]}`}>{k} · {project.components.filter((c) => c.kind === k).length}</span>
          ))}
        </div>
        <div className={s.row}>
          <span className={s.muted}>{selected.length}/4 selected</span>
          <button className={s.primary} disabled={selected.length < 2 || busy} onClick={inventSelected}>
            {busy ? 'Inventing…' : 'Invent with selection'}
          </button>
        </div>
      </div>
      {error && <div className={s.error}>{error}</div>}
      <div className={s.grid}>
        {project.components.map((c) => {
          const on = selected.includes(c.id);
          return (
            <button
              key={c.id}
              className={s.cardHover}
              style={{ textAlign: 'left', font: 'inherit', borderColor: on ? '#f5c542' : undefined, background: on ? '#f5c5420d' : undefined }}
              onClick={() => toggle(c.id)}
              aria-pressed={on}
            >
              <div className={s.between} style={{ marginBottom: '0.4rem' }}>
                <b>{c.name}</b>
                <span className={`${s.chip} ${s[`kind_${c.kind}`]}`}>{c.kind}</span>
              </div>
              <div className={s.muted}>Found in {c.mentions} sources · {c.fields.slice(0, 2).join(', ')}</div>
              {c.context && <p className={`${s.muted} ${s.clamp3}`} style={{ margin: '0.5rem 0 0', fontStyle: 'italic' }}>“{c.context}”</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
