import Image from 'next/image';
import { PortalCarousel } from '../portal-carousel';

export default function Page() {
  return <main className="portal-home">
    <h1 className="sr-only">빈타제</h1>
    <div className="portal-home__apps"><PortalCarousel pages={[
      { id: 'staff-apps', label: '업무 앱', content: <><h2 id="staff-apps-title" className="sr-only">업무 앱</h2><div className="staff-empty"><strong>열 수 있는 업무 앱이 없습니다.</strong> 필요하면 관리자에게 권한을 요청해주세요.</div></> },
      { id: 'external-links', label: 'SNS·외부 링크', content: <><h2 id="external-links-title" className="sr-only">SNS·외부 링크</h2><ul className="portal-app-grid" aria-labelledby="external-links-title" /></> },
      { id: 'admin-shortcuts', label: '관리 바로가기', content: <><h2 id="admin-shortcuts-title" className="sr-only">관리 바로가기</h2><ul className="portal-app-grid" aria-labelledby="admin-shortcuts-title" /></> },
    ]} /></div>
    <div className="portal-home__art"><div className="portal-home__art-frame">
      <Image src="/images/login-background.png" alt="" width={1830} height={1220} unoptimized priority className="portal-home__art-image" />
      <form className="portal-home__signout"><button className="staff-signin-button" type="button"><span className="form-submit-button__content"><span className="form-submit-button__measure" aria-hidden="true">로그아웃</span><span className="form-submit-button__measure" aria-hidden="true">로그아웃 중…</span><span className="form-submit-button__visible">로그아웃</span></span></button></form>
    </div></div>
  </main>;
}
