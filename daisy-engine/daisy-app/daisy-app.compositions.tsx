import { MemoryRouter } from 'react-router-dom';
import { DaisyApp } from './daisy-app.js';

/** Daisy workbench home page. */
export const DaisyAppBasic = () => {
  return (
    <MemoryRouter>
      <DaisyApp />
    </MemoryRouter>
  );
};
