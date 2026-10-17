import { useEffect, useRef, useState } from "react";
import { SHOP } from "../data/content";

function CopyAddress({ target }: { target: React.RefObject<HTMLElement> }) {
  const [label, setLabel] = useState("Copy address");
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const flash = (text: string) => {
    setLabel(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLabel("Copy address"), 1800);
  };
  const selectText = () => {
    const el = target.current;
    const selection = getSelection();
    if (!el || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${SHOP.street}, ${SHOP.city}`);
      flash("Copied");
    } catch {
      selectText();
      flash("Select and copy above");
    }
  };

  return (
    <button className="copy-addr" type="button" onClick={copy}>
      {label}
    </button>
  );
}

export function VisitFooter() {
  const address = useRef<HTMLElement>(null);
  return (
    <footer className="visit" id="visit">
      <div className="view3d" id="finView" aria-hidden="true" />
      <div className="visit-in">
        <div className="finale-stage" id="finaleStage">
          <div className="tilt" id="finTilt">
            <div className="logo" id="finaleLogo" aria-hidden="true" />
          </div>
        </div>
        <div className="visit-grid fade">
          <div className="v-cta">
            <p className="eyebrow">
              <span className="trk">B2</span> Visit
            </p>
            <h2 className="h2">Come dig the crates</h2>
            <a
              className="btn"
              href={SHOP.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit the shop <span aria-hidden="true">▶</span>
            </a>
          </div>
          <div>
            <h3 className="v-h">Address</h3>
            <address ref={address}>
              {SHOP.street}
              <br />
              {SHOP.city}
            </address>
            <CopyAddress target={address} />
          </div>
          <div>
            <h3 className="v-h">Opening hours</h3>
            <dl className="hours">
              {SHOP.hours.map(([day, time]) => (
                <div key={day} style={{ display: "contents" }}>
                  <dt>{day}</dt>
                  <dd>{time}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h3 className="v-h">Follow</h3>
            <ul className="social">
              {SHOP.social.map(([name, url]) => (
                <li key={name}>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {name}
                  </a>
                </li>
              ))}
            </ul>
            <div className="v-credit">
              <h3 className="v-h">Special thanks</h3>
              <p className="credit-name">Emiliia Merzliakova</p>
              <p className="credit-note">for the hand-drawn LOOP logo</p>
            </div>
          </div>
        </div>
        <div className="colophon">
          <span>© 2026 LOOP · Records, tapes &amp; sound gear</span>
          <span>End of side B. Flip it and play again.</span>
        </div>
      </div>
    </footer>
  );
}
