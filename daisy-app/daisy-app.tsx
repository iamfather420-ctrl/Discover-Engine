import { Routes, Route, Link } from 'react-router-dom';
import { HomePage } from './home-page.js';
import { ProjectPage } from './project-page.js';
import { DaisyLogo } from './daisy-logo.js';
import s from './ui.module.css';

/** Daisy Invention Engine — the workbench app shell and router. */
export function DaisyApp() {
  return (
    <div className={s.shell}>
      <header className={s.header}>
        <Link to="/" className={s.brand}>
          <DaisyLogo /> Daisy <small>Invention Engine</small>
        </Link>
        <Link to="/" className={s.ghost}>+ New research</Link>
      </header>
      <main className={s.main}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects/:id" element={<ProjectPage />} />
        </Routes>
      </main>
    </div>
  );
}
