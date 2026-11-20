'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

type TopbarIdentityLinkProps = {
  email: string;
  fallbackReturnTo: string;
};

function getSafeReturnPath(pathname: string, searchParams: URLSearchParams) {
  if (pathname === '/sign-in') {
    return null;
  }

  const query = searchParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}

export function TopbarIdentityLink({
  email,
  fallbackReturnTo,
}: TopbarIdentityLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const href = useMemo(() => {
    const returnTo =
      getSafeReturnPath(pathname, new URLSearchParams(searchParams)) ??
      fallbackReturnTo;

    return `/sign-in?mode=cover&next=${encodeURIComponent(returnTo)}`;
  }, [fallbackReturnTo, pathname, searchParams]);

  return (
    <Link
      href={href}
      className="topbar__identity"
      aria-label="로그인 전 화면 보기"
      title="로그인 전 화면 보기"
    >
      <span>{pathname === '/access-denied' ? 'viewer@example.invalid' : email}</span>
    </Link>
  );
}
