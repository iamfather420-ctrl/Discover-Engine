import { useEffect, useState } from 'react';
import type { Project } from '../invention-service/types.js';
import { api } from './api.js';
import s from './ui.module.css';

/**
 * Stage 5 — run isolated Monte Carlo prototypes of a design against the baseline.
 */
export function ExperimentStage({ project, initialId, onChange }: { project: Project; initialId?: string; onChange: () => void }) {
  const [invId, setInvId] = useState(initialId || project.inventions[0]?.id);
  const [trials, setTrials] = useState(5000);
  const [noise, setNoise] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialId) setInvId(initialId);
  }, [initialId]);

  const inv = project.inventions.find((i) => i.id === invId);
  const result = inv?.experiments[inv.experiments.length - 1];
  const maxCount = result ? Math.max(...result.histogram.map((h) => h.count)) : 1;

  const run = async () => {
    if (!inv) return;
    setBusy(true);
    setError(null);
    try {
      await api.runExperiment(project.id, inv.id, trials, noise);
      onChange();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!inv) return <div className={s.empty}>No designs to test yet.</div>;

  return (
    <div className={s.grid2} style={{ alignItems: 'start' }}>
      <div className={s.card}>
        <div className={s.form}>
          <div>
            <label className={s.label} htmlFor="inv">Design under test</label>
            <select id="inv" className={s.input} value={invId} onChange={(e) => setInvId(e.target.value)}>
              {project.inventions.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
            </select>
          </div>
          <div className={s.card} style={{ background: '#0d1016' }}>
            <div className={s.statLabel}>Hypothesis</div>
            <div className={s.muted} style={{ marginTop: '0.3rem' }}>{inv.hypothesis}</div>
          </div>
          <div>
            <label className={s.label} htmlFor="trials">Trials: {trials.toLocaleString()}</label>
            <input id="trials" type="range" min={500} max={20000} step={500} value={trials} onChange={(e) => setTrials(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label className={s.label} htmlFor="noise">Baseline variability: ±{noise}%</label>
            <input id="noise" type="range" min={0} max={15} step={0.5} value={noise} onChange={(e) => setNoise(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <p className={s.muted} style={{ margin: 0 }}>
            Each trial samples the design's gain (±uncertainty), integration losses that grow with complexity, a failure chance based on
            evidence maturity, and baseline noise.
          </p>
          {error && <div className={s.error}>{error}</div>}
          <button className={s.primary} onClick={run} disabled={busy}>{busy ? 'Running…' : 'Run experiment'}</button>
        </div>
      </div>

      <div className={s.card}>
        {result ? (
          <div className={s.stack}>
            <div className={s.between}>
              <h2 className={s.h2} style={{ margin: 0 }}>Result</h2>
              <span className={`${s.chip} ${s[`v_${result.verdict}`]}`}>hypothesis {result.verdict}</span>
            </div>
            <div className={s.stats}>
              <div className={s.stat}><span className={s.statValue}>{result.meanImprovement > 0 ? '+' : ''}{result.meanImprovement}%</span><span className={s.statLabel}>Mean vs baseline</span></div>
              <div className={s.stat}><span className={s.statValue}>{Math.round(result.probBetter * 100)}%</span><span className={s.statLabel}>P(beats baseline)</span></div>
              <div className={s.stat}><span className={s.statValue}>{Math.round(result.probHitsTarget * 100)}%</span><span className={s.statLabel}>P(hits target)</span></div>
            </div>
            <div>
              <div className={s.statLabel}>Outcome distribution (% vs baseline)</div>
              <div className={s.hist}>
                {result.histogram.map((h) => (
                  <div key={h.from} className={s.histBar} title={`${h.from}…${h.to}%: ${h.count}`}
                    style={{ height: `${(h.count / maxCount) * 100}%`, background: h.to <= 0 ? '#ff8080' : h.from >= 0 ? '#6ee7b7' : '#f5c542' }} />
                ))}
              </div>
              <div className={s.histAxis}><span>{result.histogram[0].from}%</span><span>0</span><span>{result.histogram[result.histogram.length - 1].to}%</span></div>
            </div>
            <div className={s.muted}>90% interval: {result.p5}% … {result.p95}% · σ {result.stdDev} · {result.params.trials.toLocaleString()} trials</div>
            {inv.experiments.length > 1 && (
              <div>
                <div className={s.statLabel} style={{ marginBottom: '0.4rem' }}>Run history</div>
                <div className={s.row}>
                  {inv.experiments.map((e, i) => (
                    <span key={e.id} className={`${s.chip} ${s[`v_${e.verdict}`]}`}>#{i + 1} {e.meanImprovement}%</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={s.empty}>Run an experiment to see results.</div>
        )}
      </div>
    </div>
  );
}
