'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const adminLinks = [{ href: '/admin/kiosks', label: 'QR 관리' }] as const;

export function TimetableNav({
  isAdmin,
  variant = 'desktop',
}: {
  isAdmin: boolean;
  variant?: 'desktop' | 'mobile';
}) {
  const pathname = usePathname();
  const visibleLinks = isAdmin ? adminLinks : [];

  function renderNavigationLinks() {
    return visibleLinks.map((link) => {
      const active =
        pathname === link.href || pathname.startsWith(`${link.href}/`);

      return (
        <Link
          key={link.href}
          href={link.href}
          data-label={link.label}
          className={active ? 'is-active' : undefined}
          aria-current={active ? 'page' : undefined}
        >
          <span>{link.label}</span>
        </Link>
      );
    });
  }

  if (visibleLinks.length === 0) {
    return null;
  }

  if (variant === 'mobile') {
    const settingsLink = visibleLinks[0];
    const active =
      pathname === settingsLink.href ||
      pathname.startsWith(`${settingsLink.href}/`);

    return (
      <div className="topbar__navigation topbar__navigation--mobile">
        <Link
          href={settingsLink.href}
          className={`topbar__settings-link${active ? ' is-active' : ''}`}
          aria-label="QR 관리"
          aria-current={active ? 'page' : undefined}
          title="QR 관리"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              strokeLinejoin="round"
              d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.09a2 2 0 0 1 1 1.74v.5a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <div className="topbar__navigation topbar__navigation--desktop">
      <nav className="topbar__nav" aria-label="Timetable 메뉴">
        {renderNavigationLinks()}
      </nav>
    </div>
  );
}
