const NAV = [
  ['#tapes', 'Tapes'],
  ['#records', 'Vinyl'],
  ['#gear', 'Gear'],
  ['#visit', 'Visit']
] as const;

export function Header() {
  return (
    <header className="topbar">
      <div className="topbar-in">
        <a className="mark" href="#top" aria-label="LOOP, back to the top">
          <span className="mark-in mark-l" />
          <span className="mark-in mark-p" />
        </a>
        <nav className="nav" aria-label="Sections">
          {NAV.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <button className="pill sound" id="soundToggle" type="button" aria-pressed="false" aria-label="Turn sound on">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
            <path className="w" d="M15.5 9.2c1.2 1.6 1.2 4 0 5.6M18.3 6.8c2.5 3 2.5 7.4 0 10.4" />
            <path className="x" d="M16 9.5l5 5M21 9.5l-5 5" />
          </svg>
          <span id="soundTxt">Sound off</span>
        </button>
      </div>
    </header>
  );
}
