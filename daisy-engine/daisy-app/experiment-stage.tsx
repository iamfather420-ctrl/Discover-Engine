import type { Project } from '@agatenft/daisy-engine.invention-service';
import s from './ui.module.css';

/** Stage 5 — measured validation is pending; synthetic experiments are disabled. */
export function ExperimentStage({ project }: { project: Project; initialId?: string; onChange: () => void }) {
  if (!project.inventions.length) return <div className={s.empty}>No designs are available yet.</div>;
  return (
    <section className={s.card}>
      <h2 className={s.h2}>Experimental validation pending</h2>
      <p className={s.muted}>Monte Carlo simulations and generated estimates are not real-world experiments. Discover Engine will not label them as proof or performance results.</p>
      <p>Each design remains a hypothesis until a physical or software prototype is tested against a defined baseline using a documented protocol, calibrated instruments, raw measurements, and reproducible analysis.</p>
      <p className={s.muted}>No measured results have been submitted for this project.</p>
    </section>
  );
}
