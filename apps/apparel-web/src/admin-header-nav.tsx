'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/admin/products',
    label: '인벤토리',
  },
  {
    href: '/admin/sales',
    label: '판매내역',
  },
  {
    href: '/admin/stats',
    label: '통계',
  },
  {
    href: '/admin/audit',
    label: '데이터 변경 이력',
  },
  {
    href: '/admin/support',
    label: '용어집',
  },
];

function isNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminHeaderNav() {
  const pathname = usePathname();

  if (pathname === '/access-denied') return null;

  return (
    <nav className="topbar__nav" aria-label="관리 메뉴">
      {navItems.map((item) => {
        const isActive = isNavItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive ? 'is-active' : undefined}
            data-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
