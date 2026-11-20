"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
export const libraryMenus = [
  ["/bookmarks", "보관함"],
  ["/members", "구성원"],
  ["/mypage", "마이페이지"],
] as const;
export function LibraryNavigationLinks({ pathname }: { pathname: string }) {
  const current = pathname.startsWith("/publications") || pathname.startsWith("/documents")
      ? "/"
      : pathname;
  return (
    <nav className="library-navigation" aria-label="Library 메뉴">
      {libraryMenus.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={current === href ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
export function LibraryNavigation({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const pathname = usePathname();
  const current = pathname.startsWith("/publications") || pathname.startsWith("/documents") ? "/" : pathname;
  const [open, setOpen] = useState(false);
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (variant !== "mobile" || !open) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("pointerdown", outside); };
  }, [open, variant]);
  const links = libraryMenus.map(([href, label]) => <Link key={href} href={href} data-label={label} className={current === href ? "is-active" : undefined} aria-current={current === href ? "page" : undefined} tabIndex={variant === "mobile" && !open ? -1 : undefined} onClick={variant === "mobile" ? () => setOpen(false) : undefined}><span>{label}</span></Link>);
  if (variant === "desktop") return <div className="topbar__navigation topbar__navigation--desktop"><nav className="topbar__nav" aria-label="Library 메뉴">{links}</nav></div>;
  return <div className="topbar__navigation topbar__navigation--mobile">
    <div className={`topbar__menu-backdrop${open ? " is-open" : ""}`} aria-hidden="true" />
    <div ref={menuRef} className={`topbar__menu${open ? " is-open" : ""}`} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setOpen(false); requestAnimationFrame(() => menuRef.current?.querySelector("button")?.focus()); } }}>
      <button type="button" data-hydrated={hydrated} aria-expanded={open} aria-controls="library-mobile-navigation" aria-label={open ? "메뉴 닫기" : "메뉴 열기"} title={open ? "메뉴 닫기" : "메뉴 열기"} onClick={() => setOpen((value) => !value)}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path className="topbar__menu-icon-bars" d="M4 7h16M4 12h16M4 17h16" /><path className="topbar__menu-icon-close" d="M6 6l12 12M18 6 6 18" /></svg></button>
      <nav id="library-mobile-navigation" className="topbar__mobile-nav" aria-label="모바일 메뉴" aria-hidden={!open}><svg className="topbar__menu-bridge" viewBox="0 0 50 46" aria-hidden="true" focusable="false"><path d="M0 30 C14 30 19 27 24 22 L29 17 C33 12 34 7 34 0 H50 V12 C50 20 46 26 40 31 C35 35 33 40 33 46 H0 Z" /></svg>{links}</nav>
    </div>
  </div>;
}
