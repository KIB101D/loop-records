import { GADGETS, TYPED_LINE } from '../data/content';

const CHARS = [...TYPED_LINE];

export function GearSection() {
  return (
    <section className="scene scene-gear" id="gear" aria-labelledby="gearTitle">
      <div className="gear">
        <div className="gear-copy fade">
          <p className="eyebrow line"><span className="trk">B1</span> Sound gear</p>
          <h2 className="h2" id="gearTitle"><span className="line">Small gear, big sound</span></h2>
          <p className="lede line">Headphones, speakers, players...</p>
        </div>
        <div className="shelf fade">
          <div className="shelf-items" id="shelf">
            {GADGETS.map(g => (
              <div key={g.key} className="gadget" tabIndex={0} role="img" aria-label={g.name} data-g={g.key}>
                <span className="view3d g-view" />
                <span className="g-fallback" />
                <span className="g-tag" aria-hidden="true">
                  <span className="t-long">{g.name}</span>
                  <span className="t-short">{g.short}</span>
                </span>
              </div>
            ))}
          </div>
          <svg className="shelf-line" id="shelfLine" viewBox="0 0 1000 20" preserveAspectRatio="none" aria-hidden="true" />
        </div>
        <p className="typed fade" id="typed">
          <span className="sr-only">{TYPED_LINE}</span>
          <span aria-hidden="true">
            {CHARS.map((ch, i) => <span key={i} className="ch">{ch === ' ' ? ' ' : ch}</span>)}
          </span>
          <span className="caret" aria-hidden="true" />
        </p>
      </div>
    </section>
  );
}
