import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from './api.js';
import type { ProjectSummary } from './api.js';
import { STAGES } from './stages.js';
import s from './ui.module.css';

const SUGGESTED_DOMAINS = ['bio-inspired', 'machine learning', 'metamaterial', 'control theory', 'quantum', 'soft robotics', 'nanomaterials', 'swarm intelligence'];
const EXAMPLES = ['solid state battery', 'water desalination', 'drone navigation', 'carbon capture', 'wearable health sensor'];

/** Landing page: start a research run and browse previous projects. */
export function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [domains, setDomains] = useState<string[]>(SUGGESTED_DOMAINS.slice(0, 4));
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  useEffect(() => {
    api.listProjects().then(setProjects).catch(() => undefined);
  }, []);

  const toggle = (d: string) => setDomains((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : cur.length >= 5 ? cur : [...cur, d]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const p = await api.createProject(query, domains);
      navigate(`/projects/${p.id}`);
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  const addCustom = () => {
    const d = custom.trim().toLowerCase();
    if (d && !domains.includes(d) && domains.length < 5) setDomains([...domains, d]);
    setCustom('');
  };

  return (
    <>
      <section className={s.hero}>
        <div className={s.eyebrow}>Daisy · Invention Engine</div>
        <h1 className={s.h1}>From research to working inventions.</h1>
        <p className={s.lead}>
          Daisy searches live scientific literature, breaks it down into technical building blocks, finds combinations nobody has tried,
          designs new solutions, tests them in simulation and packages the results.
        </p>
      </section>

      <div className={s.grid2}>
        <form className={s.card} onSubmit={submit}>
          <div className={s.form}>
            <div>
              <label className={s.label} htmlFor="q">What should Daisy invent for?</label>
              <input id="q" className={s.input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. solid state battery" required minLength={3} />
              <div className={s.row} style={{ marginTop: '0.5rem' }}>
                <span className={s.muted}>Try:</span>
                {EXAMPLES.map((ex) => (
                  <button type="button" key={ex} className={s.chipToggle} onClick={() => setQuery(ex)}>{ex}</button>
                ))}
              </div>
            </div>
            <div>
              <span className={s.label}>Adjacent domains to cross-pollinate (up to 5)</span>
              <div className={s.row}>
                {[...new Set([...SUGGESTED_DOMAINS, ...domains])].map((d) => (
                  <button type="button" key={d} className={`${s.chipToggle} ${domains.includes(d) ? s.chipOn : ''}`} onClick={() => toggle(d)} aria-pressed={domains.includes(d)}>
                    {d}
                  </button>
                ))}
              </div>
              <div className={s.row} style={{ marginTop: '0.6rem' }}>
                <input className={s.input} style={{ flex: 1, minWidth: 160 }} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add a domain…" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} />
                <button type="button" className={s.btn} onClick={addCustom}>Add</button>
              </div>
            </div>
            {error && <div className={s.error}>{error}</div>}
            <button className={s.primary} disabled={busy || query.trim().length < 3}>{busy ? 'Starting…' : 'Start discovery →'}</button>
          </div>
        </form>

        <div className={s.card}>
          <h2 className={s.h2}>Recent research</h2>
          {projects.length === 0 ? (
            <p className={s.muted}>No projects yet. Start your first discovery.</p>
          ) : (
            <div className={s.stack} style={{ gap: '0.6rem' }}>
              {projects.map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`} className={s.cardHover} style={{ padding: '0.85rem 1rem' }}>
                  <div className={s.between}>
                    <b>{p.query}</b>
                    <span className={`${s.chip} ${p.status === 'ready' ? s.v_supported : p.status === 'error' ? s.v_rejected : s.v_inconclusive}`}>{p.status}</span>
                  </div>
                  <div className={s.muted}>{p.domains.join(' · ')} — {new Date(p.createdAt).toLocaleString()}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={s.pipeline}>
        {STAGES.map((st, i) => (
          <div key={st.key} className={s.pipeStep}>
            <b>{i + 1}. {st.label}</b>
            <span>{st.blurb}</span>
          </div>
        ))}
      </div>
    </>
  );
}
