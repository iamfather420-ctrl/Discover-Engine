import { useState } from 'react';
import type { Project } from '@agatenft/daisy-engine.invention-service';
import { api } from './api.js';
import s from './ui.module.css';

/** Stage 5 — measured validation is pending; synthetic experiments are disabled. */
export function ExperimentStage({ project, onChange }: { project: Project; initialId?: string; onChange: () => void }) {
  const [payload, setPayload] = useState(JSON.stringify({
    title: 'Measured prototype run', hypothesisId: project.inventions[0]?.id || 'replace-with-hypothesis-id',
    protocol: { id: 'protocol-001', version: '1.0', method: 'Describe the controlled measurement procedure' },
    baseline: { description: 'Control condition', value: 0, unit: 'unit' },
    observations: [{ value: 0, unit: 'unit', observedAt: new Date().toISOString(), replicate: 'replicate-1' }],
    sampleSize: 1, environment: 'Describe environment', operator: 'Operator attribution (not authenticated)',
    dataset: { uri: 'https://example.org/data.csv', sha256: 'a'.repeat(64), mediaType: 'text/csv' },
    analysis: { method: 'Describe analysis', version: '1.0', codeUri: 'https://example.org/analysis.py', codeSha256: 'b'.repeat(64) },
    uncertainty: { method: 'Describe uncertainty method', value: 0, unit: 'unit' },
    calibration: 'Describe calibration and reference standard',
  }, null, 2));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage(''); setBusy(true);
    try {
      const record = await api.ingestMeasurement(project.id, JSON.parse(payload));
      setMessage(`Saved as ${record.status}. This is an unverified submission, not proof.`);
      setSubmitted(true); onChange();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Submission failed');
    } finally { setBusy(false); }
  };
  if (!project.inventions.length) return <div className={s.empty}>No designs are available yet.</div>;
  return (
    <div className={s.stack}>
      <section className={s.card}>
        <h2 className={s.h2}>Experimental validation pending</h2>
        <p className={s.muted}>Monte Carlo simulations and generated estimates are not real-world experiments. They are not accepted as proof.</p>
        <p>Submit a measured dataset with a documented protocol, baseline, observations, calibration, uncertainty, and reproducible analysis metadata. The service records it as <b>measured_unverified</b>; it does not independently authenticate the operator, download the dataset, verify its digest, execute the analysis, or certify the result.</p>
      </section>
      <section className={s.card}>
        <h2 className={s.h2}>Submit traceable measurement record</h2>
        <p className={s.muted}>Replace every example value and URL with real experiment details. The example hashes are placeholders and will not be independently checked.</p>
        <form className={s.form} onSubmit={submit}>
          <label className={s.label} htmlFor="measurement-json">Measurement record (JSON)</label>
          <textarea id="measurement-json" className={s.input} rows={18} spellCheck={false} value={payload} onChange={e => {setPayload(e.target.value);setSubmitted(false);}} />
          <button className={s.primary} type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit as unverified evidence'}</button>
        </form>
        {message && <p role="status" className={submitted ? s.muted : s.error}>{message}</p>}
      </section>
      <section className={s.card}>
        <h2 className={s.h2}>Existing submissions</h2>
        {project.evidenceMeasurements?.length ? project.evidenceMeasurements.map(record => (
          <p key={record.id}>{record.title} — <b>{record.status}</b> — {record.ingestedAt}</p>
        )) : <p className={s.muted}>No measured records have been submitted for this project.</p>}
      </section>
    </div>
  );
}
