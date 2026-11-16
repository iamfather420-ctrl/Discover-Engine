import type { Project } from '../invention-service/types.js';
import s from './ui.module.css';

/** Real experiments are not simulated; this stage explains the required evidence. */
export function ExperimentStage({ project, initialId }: { project: Project; initialId?: string; onChange: () => void }) {
  const inv = project.inventions.find((i) => i.id === initialId) || project.inventions[0];
  if (!inv) return <div className={s.empty}>No designs are available.</div>;
  return <div className={s.card}>
    <h2 className={s.h2}>Experimental validation required</h2>
    <p><b>{inv.title}</b> is a hypothesis, not a verified result.</p>
    <p className={s.muted}>Discover Engine does not generate simulated outcomes or treat Monte Carlo trials as real experiments. No performance gain, probability, or verdict is asserted.</p>
    <h3 className={s.h3}>To establish a real result, record:</h3>
    <ul className={s.list}>
      <li>A defined baseline and control group</li>
      <li>A reproducible protocol and equipment/method details</li>
      <li>Raw observations, units, timestamps and sample counts</li>
      <li>Source/provenance for the measurements and responsible operator</li>
      <li>Analysis method, uncertainty calculation and reproducible data files</li>
    </ul>
    <p className={s.muted}>Validation status: pending. The current project has no measured experimental evidence.</p>
  </div>;
}
