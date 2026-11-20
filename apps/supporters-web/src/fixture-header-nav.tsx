'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { setStaffStatusToast } from '@vintad3e/ui/toast';
import {
  APP_INSTALL_GUIDE_TEXT,
  promptAppInstall,
  readAppInstallEnvironment,
  resolveAppInstallAction,
  subscribeAppInstall,
  type AppInstallGuide,
} from './fixture-app-install';
type DashboardRole = 'admin' | 'viewer';
const TOPBAR_COMPACT_QUERY = '(max-width: 860px)';

type NavItem = { href: string; label: string; adminOnly?: boolean; viewerOnly?: boolean; viewerHref?: string };

const navItems: NavItem[] = [
  { href: '/instagram', label: 'Instagram' },
  { href: '/tiktok', label: 'TikTok' },
  { href: '/coupon', label: '쿠폰' },
  { href: '/settlements', label: '정산 내역' },
  { href: '/formula', label: '정산 공식', viewerHref: '/formula-info' },
];

type InstallState = 'hidden' | 'prompt' | AppInstallGuide;
const INSTALL_TOAST_KEY = 'supporters-app-install';
const INSTALL_TOAST_MS = 8000;
let installToastTimer: ReturnType<typeof setTimeout> | undefined;

function readInstallState(): InstallState {
  const action = resolveAppInstallAction(readAppInstallEnvironment());
  return action.kind === 'guide' ? action.guide : action.kind;
}

function showInstallGuide(guide: AppInstallGuide) {
  setStaffStatusToast(INSTALL_TOAST_KEY, APP_INSTALL_GUIDE_TEXT[guide], 'info');
  clearTimeout(installToastTimer);
  installToastTimer = setTimeout(() => setStaffStatusToast(INSTALL_TOAST_KEY, null), INSTALL_TOAST_MS);
}

function isNavItemActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function GtmHeaderNav({
  role,
  variant = 'desktop',
}: {
  role: DashboardRole;
  variant?: 'desktop' | 'mobile';
}) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const installState = useSyncExternalStore<InstallState>(subscribeAppInstall, readInstallState, () => 'hidden');
  const items = navItems.filter((item) => (!item.adminOnly || role === 'admin') && (!item.viewerOnly || role === 'viewer'));

  function renderLinks(closeMenu = false) {
    return items.map((item) => {
      const href = role === 'viewer' && item.viewerHref ? item.viewerHref : item.href;
      const isActive = isNavItemActive(pathname, href);

      return (
        <Link
          key={href}
          href={href}
          data-label={item.label}
          className={isActive ? 'is-active' : undefined}
          aria-current={isActive ? 'page' : undefined}
          tabIndex={closeMenu && !isMenuOpen ? -1 : undefined}
          onClick={
            closeMenu
              ? () => setIsMenuOpen(false)
              : undefined
          }
        >
          <span>{item.label}</span>
        </Link>
      );
    });
  }

  useEffect(() => {
    if (variant !== 'mobile' || !isMenuOpen) {
      return;
    }

    const mobileQuery = window.matchMedia(TOPBAR_COMPACT_QUERY);
    const closeMenu = () => setIsMenuOpen(false);
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        closeMenu();
      }
    };
    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (!event.matches) {
        closeMenu();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    mobileQuery.addEventListener('change', handleViewportChange);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      mobileQuery.removeEventListener('change', handleViewportChange);
    };
  }, [isMenuOpen, variant]);

  if (variant === 'mobile') {
    return (
      <div className="topbar__navigation topbar__navigation--mobile">
        <div className={`topbar__menu-backdrop${isMenuOpen ? ' is-open' : ''}`} aria-hidden="true" />
        <div
          className={`topbar__menu${isMenuOpen ? ' is-open' : ''}`}
          ref={menuRef}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') {
              return;
            }

            event.preventDefault();
            setIsMenuOpen(false);
            requestAnimationFrame(() =>
              menuRef.current?.querySelector('button')?.focus(),
            );
          }}
        >
          <button type="button" aria-expanded={isMenuOpen} aria-controls="supporters-mobile-navigation" aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'} title={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'} onClick={() => setIsMenuOpen((open) => !open)}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path className="topbar__menu-icon-bars" d="M4 7h16M4 12h16M4 17h16" />
              <path className="topbar__menu-icon-close" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <nav id="supporters-mobile-navigation" className="topbar__mobile-nav" aria-label="모바일 메뉴" aria-hidden={!isMenuOpen}>
            <svg className="topbar__menu-bridge" viewBox="0 0 50 46" aria-hidden="true" focusable="false">
              <path d="M0 30 C14 30 19 27 24 22 L29 17 C33 12 34 7 34 0 H50 V12 C50 20 46 26 40 31 C35 35 33 40 33 46 H0 Z" />
            </svg>
            {renderLinks(true)}
            {installState !== 'hidden' ? (
              <button
                type="button"
                className="topbar__mobile-nav-install"
                tabIndex={isMenuOpen ? undefined : -1}
                onClick={async () => {
                  setIsMenuOpen(false);
                  if (installState === 'prompt' && (await promptAppInstall())) return;
                  const state = readInstallState();
                  showInstallGuide(state === 'hidden' || state === 'prompt' ? 'browser-menu' : state);
                }}
              >
                <span>앱 다운로드</span>
              </button>
            ) : null}
          </nav>
        </div>
      </div>
    );
  }

  return (
    <div className="topbar__navigation topbar__navigation--desktop">
      <nav className="topbar__nav" aria-label="메뉴">
        {renderLinks()}
      </nav>
    </div>
  );
}
