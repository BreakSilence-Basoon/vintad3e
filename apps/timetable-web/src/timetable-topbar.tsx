import Link from 'next/link';

// Original Timetable header for the signed-out state; no identity is fabricated.
export function TimetableTopbar() {
  return <header className="topbar"><div className="topbar__inner"><div className="topbar__brand-group">
    <Link href="/?view=history" className="topbar__brand-link" aria-label="Timetable 홈으로 이동" title="홈">
      <svg className="topbar__home-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 10.8 12 3l9 7.8v9.7a.7.7 0 0 1-.7.7h-5.2v-6.4H8.9v6.4H3.7a.7.7 0 0 1-.7-.7v-9.7Z" />
      </svg>
    </Link>
  </div></div></header>;
}
