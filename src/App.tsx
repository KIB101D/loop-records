import { useEffect } from 'react';
import { startExperience } from './engine/experience';
import { Cursor, SvgDefs } from './components/Decor';
import { Header } from './components/Header';
import { TapesSection } from './components/TapesSection';
import { RecordsSection } from './components/RecordsSection';
import { GearSection } from './components/GearSection';
import { VisitFooter } from './components/VisitFooter';

export default function App() {
  useEffect(() => startExperience(), []);

  return (
    <>
      <SvgDefs />
      <div className="light" aria-hidden="true" />
      <Header />
      <main id="top">
        <TapesSection />
        <RecordsSection />
        <GearSection />
      </main>
      <VisitFooter />
      <canvas id="gl" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <Cursor />
    </>
  );
}
