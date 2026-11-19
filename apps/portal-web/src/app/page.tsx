import Image from 'next/image';
import { PortalCarousel } from '../portal-carousel';
import { fixtureAppIds, fixturePortalLinks } from '../fixture-links.mjs';
import { fixtureOrigin, fixtureSession } from '../fixture-session.mjs';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

type Tile = { id: string; name: string; icon: string | null; tone?: 'mono' | 'sns'; accessibleName?: string; href?: string; restIcon?: string };
const apps: Tile[] = ['Apparel', 'Timetable', 'Supporters', 'Partners', 'Library', 'Floor', 'Ledger', 'Creative', 'Admin', 'Catalog'].map((name) => ({
  id: name.toLowerCase(), name, icon: `/images/neutral/${name.toLowerCase()}.svg`, tone: 'mono',
}));
const social: Tile[] = [
  { id: 'instagram-official', name: 'official', accessibleName: 'Instagram official', icon: '/images/sns/instagram.svg', tone: 'sns' },
  { id: 'instagram-store', name: 'store', accessibleName: 'Instagram store', icon: '/images/sns/instagram.svg', tone: 'sns' },
  { id: 'tiktok-official', name: 'official', accessibleName: 'TikTok official', icon: '/images/sns/tiktok.svg', tone: 'sns' },
  { id: 'tiktok-staff', name: 'staff', accessibleName: 'TikTok staff', icon: '/images/sns/tiktok.svg', tone: 'sns' },
  { id: 'youtube-official', name: 'official', accessibleName: 'YouTube official', icon: '/images/sns/youtube.svg', tone: 'sns' },
  { id: 'shop', name: 'Shop', icon: '/images/neutral/shop.svg' },
  { id: 'notion-homebase', name: 'Notion', accessibleName: 'Notion Homebase', icon: '/images/shortcuts/notion.png', tone: 'sns' },
];
const shortcuts: Tile[] = [
  { id: 'cafe24-admin', name: '관리자센터', accessibleName: '카페24 관리자센터', icon: '/images/shortcuts/cafe24.png', tone: 'sns' },
  { id: 'cafe24-hosting', name: '호스팅센터', accessibleName: '카페24 호스팅센터', icon: '/images/shortcuts/cafe24.png', tone: 'sns' },
  { id: 'cafe24-developers', name: '개발자센터', accessibleName: '카페24 개발자센터', icon: '/images/shortcuts/cafe24.png', tone: 'sns' },
  { id: 'meta-developers', name: 'Meta', accessibleName: 'Meta 개발자센터', icon: '/images/shortcuts/meta.svg', tone: 'sns' },
  { id: 'tiktok-developers', name: 'TikTok', accessibleName: 'TikTok 개발자센터', icon: '/images/sns/tiktok.svg', tone: 'sns' },
];
function TileList({ items, labelledBy }: { items: Tile[]; labelledBy: string }) {
  return <ul className="portal-app-grid" aria-labelledby={labelledBy}>{items.map((item) => <li key={item.id} className="portal-app-grid__item">
    {item.href && item.icon && item.restIcon ? <a className="portal-app" href={item.href} draggable={false}>
      <span className="portal-app__badge"><span className="portal-app__icon-stack"><Image src={item.restIcon} alt="" width={64} height={64} unoptimized draggable={false} className="portal-app__icon portal-app__icon--rest" /><Image src={item.icon} alt="" width={64} height={64} unoptimized draggable={false} className="portal-app__icon portal-app__icon--color" /></span></span>
      <span className="portal-app__name">{item.name}</span>
    </a> :
    <div className={`portal-app${item.tone ? ` portal-app--${item.tone}` : ''}`} aria-label={item.accessibleName ?? item.name}>
      <span className="portal-app__badge">{item.icon ? <Image src={item.icon} alt="" width={64} height={64} unoptimized draggable={false} className="portal-app__icon" /> : null}</span>
      <span className="portal-app__name">{item.name}</span>
    </div>}
  </li>)}</ul>;
}
export default async function Page() {
  const origin = fixtureOrigin(process.env);
  if (origin) {
    const requestHeaders = await headers();
    const host = requestHeaders.get('host');
    if (host !== new URL(origin).host) notFound();
    if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) redirect('/sign-in');
  }
  const links = fixturePortalLinks({ nodeEnv: process.env.NODE_ENV, enabled: process.env.VINTAD3E_PORTAL_FIXTURE, grants: origin ? fixtureAppIds : [] });
  const visibleApps = apps.map((app) => links[app.id] && app.icon ? { ...app, href: links[app.id], restIcon: app.icon } : app);
  return <main className="portal-home">
    <h1 className="sr-only">빈타제</h1>
    <div className="portal-home__apps"><PortalCarousel pages={[
      { id: 'staff-apps', label: '업무 앱', content: <><h2 id="staff-apps-title" className="sr-only">업무 앱</h2><TileList items={visibleApps} labelledBy="staff-apps-title" /></> },
      { id: 'external-links', label: 'SNS·외부 링크', content: <><h2 id="external-links-title" className="sr-only">SNS·외부 링크</h2><TileList items={social} labelledBy="external-links-title" /></> },
      { id: 'admin-shortcuts', label: '관리 바로가기', content: <><h2 id="admin-shortcuts-title" className="sr-only">관리 바로가기</h2><TileList items={shortcuts} labelledBy="admin-shortcuts-title" /></> },
    ]} /></div>
    <div className="portal-home__art"><div className="portal-home__art-frame">
      <Image src="/images/neutral/background.svg" alt="" width={1830} height={1220} unoptimized priority className="portal-home__art-image" />
      <form className="portal-home__signout" action={origin ? '/api/fixture/logout' : undefined} method={origin ? 'post' : undefined}><button className="staff-signin-button" type={origin ? 'submit' : 'button'}><span className="form-submit-button__content"><span className="form-submit-button__measure" aria-hidden="true">로그아웃</span><span className="form-submit-button__measure" aria-hidden="true">로그아웃 중…</span><span className="form-submit-button__visible">로그아웃</span></span></button></form>
    </div></div>
  </main>;
}
