export function SvgDefs() {
  return (
    <svg className="defs" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="gGloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset=".34" stopColor="#fff" stopOpacity=".05" />
          <stop offset=".35" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".12" />
        </linearGradient>
        <radialGradient id="gSheen" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="104">
          <stop offset=".36" stopColor="#fff" stopOpacity="0" />
          <stop offset=".72" stopColor="#fff" stopOpacity=".17" />
          <stop offset="1" stopColor="#fff" stopOpacity=".04" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function Cursor() {
  return (
    <div className="cursor" aria-hidden="true">
      <span className="c-ring" />
      <span className="c-play">▶</span>
    </div>
  );
}
