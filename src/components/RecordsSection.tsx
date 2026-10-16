import { PICKS } from '../data/content';

const EQ_BARS = Array.from({ length: 14 }, (_, i) => i);

export function RecordsSection() {
  return (
    <section className="scene scene-records" id="records" aria-labelledby="recTitle">
      <div className="view3d rec-view" id="recView" aria-hidden="true" />
      <div className="rec-grid">
        <div className="rec-copy fade">
          <p className="eyebrow line"><span className="trk">A2</span> Records</p>
          <h2 className="h2" id="recTitle"><span className="line">Vinyl first</span></h2>
          <p className="lede line">New releases, classics and second-hand gems, all checked and ready to spin.</p>
          <ul className="specs line">
            <li>33⅓ &amp; 45 RPM</li>
            <li>Graded VG+ to Mint</li>
            <li>Listen before you buy</li>
          </ul>
          <div className="np line">
            <div className="eq" id="eq" aria-hidden="true">
              {EQ_BARS.map(i => <i key={i} />)}
            </div>
            <div className="np-txt">
              <span className="np-k">Now playing</span>
              <span className="np-t" id="npTitle">LOOP Theme</span>
              <span className="np-s" id="npState">Sound is off</span>
            </div>
          </div>
          <p className="rec-hint line">Tap a single to spin it. Scroll on and the tape picks up again.</p>
        </div>
        <div className="rec-slot" id="recSlot" aria-hidden="true" />
      </div>
      <div className="pick-tags" id="pickTags" role="group" aria-label="Pick a single to play">
        {PICKS.map((p, i) => (
          <button key={p.key} className="pick-tag" type="button" data-i={i} aria-pressed="false" tabIndex={-1}>
            <b>{p.title}</b>
            <i>{p.meta}</i>
          </button>
        ))}
      </div>
    </section>
  );
}
