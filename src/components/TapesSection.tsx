export function TapesSection() {
  return (
    <section className="scene scene-tape" id="tapes" aria-labelledby="tapeTitle">
      <div className="hero">
        <h1 className="sr-only">LOOP: vinyl, music and sound gear</h1>
        <div className="logo-stage">
          <div className="tilt" id="heroTilt">
            <div className="logo" id="heroLogo" aria-hidden="true" />
          </div>
        </div>
        <div className="hero-copy">
          <p className="tagline">Vinyl, music &amp; sound gear</p>
          <div className="hint" aria-hidden="true">
            <svg viewBox="0 0 40 26">
              <rect x="1" y="1" width="38" height="24" rx="3.5" fill="#1D1A1F" />
              <rect x="5" y="4" width="30" height="11" rx="1.5" fill="#F3E8CC" />
              <circle cx="13" cy="9.5" r="3" fill="#FBF8F1" />
              <circle cx="27" cy="9.5" r="3" fill="#FBF8F1" />
              <path d="M11 25l2.5-6h13l2.5 6z" fill="#DCD6C8" />
            </svg>
            <span className="hint-strip" />
            <span className="hint-txt">scroll</span>
          </div>
        </div>
      </div>
      <div className="tape">
        <div className="tape-slot" id="tapeSlot">
          <div className="tape-static" id="tapeStatic" aria-hidden="true" />
        </div>
        <div className="tape-copy fade">
          <p className="eyebrow line"><span className="trk">A1</span> Tapes &amp; CDs</p>
          <h2 className="h2" id="tapeTitle">
            <span className="line">Music you</span>
            <span className="line">can hold</span>
          </h2>
          <p className="lede">
            <span className="line">Cassettes, CDs and rare editions:</span>{' '}
            <span className="line">music the way it was meant to be owned.</span>
          </p>
          <ul className="specs line">
            <li>Type I &amp; chrome tapes</li>
            <li>C60 · C90</li>
            <li>Box sets</li>
          </ul>
          <p className="tape-hint" id="tapeHint" hidden>
            <span className="th-dot" aria-hidden="true" />
            <span className="on-pointer">Click</span><span className="on-touch">Tap</span> anywhere to play the tape
          </p>
        </div>
      </div>
    </section>
  );
}
