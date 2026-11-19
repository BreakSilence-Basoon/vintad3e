'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

function StockDetail({ close }: { close: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement, bodyOverflow = document.body.style.overflow, rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden'; closeRef.current?.focus();
    return () => { document.body.style.overflow = bodyOverflow; document.documentElement.style.overflow = rootOverflow; if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  return <div className="graphic-dialog-backdrop guest-record-stock-backdrop" onKeyDown={event => { if (event.key === 'Escape') close(); }}><section className="graphic-dialog" role="dialog" aria-modal="true" aria-labelledby="fixture-stock-title"><div className="graphic-dialog__chrome"><div className="graphic-dialog__titlebar"><h3 className="graphic-dialog__title" id="fixture-stock-title">협업 티셔츠</h3><button ref={closeRef} type="button" className="graphic-dialog__close" onClick={close} aria-label="재고 상세 창 닫기">×</button></div></div><div className="graphic-dialog__body"><div tabIndex={0} role="region" aria-label="사이즈별 재고"><table className="guest-record-stock-table"><thead><tr><th scope="col">사이즈</th><th scope="col">재고</th></tr></thead><tbody><tr><th scope="row">M</th><td>8</td></tr><tr><th scope="row">L</th><td>12</td></tr></tbody></table></div></div></section></div>;
}

export function FixtureGuest({ id, name, amount, paid, today }: { id: string; name: string; amount: string; paid: boolean; today: string }) {
  const [slide, setSlide] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState('상의');
  const [detail, setDetail] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const logoutForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!confirming) return;
    const close = (event: PointerEvent) => { if (event.target instanceof Node && !logoutForm.current?.contains(event.target)) setConfirming(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [confirming]);
  const money = `${Number(amount).toLocaleString('ko-KR')}원`;
  const sales = `${(id === 'partner-02' ? 100014 : 100000).toLocaleString('ko-KR')}원`;
  const year = Number(today.slice(0, 4)), month = Number(today.slice(5, 7));
  return <div className="guest-preview-shell" id="guest-top"><header className="topbar guest-preview-header"><div className="guest-preview-header__inner"><div className="guest-preview-brand"><Link href={`/proj-bedroom/${id}/sign-in`} aria-label="바탕화면으로 돌아가기"><img src="/icon.svg" alt="" width="40" height="40" /></Link><div className="guest-preview-brand__name"><strong>{name}</strong><span>proj. bedroom</span></div></div><div className="guest-preview-controls"><span className="topbar__identity guest-preview-desktop-identity">partner</span><form ref={logoutForm} method="post" action={`/proj-bedroom/${id}/session/logout`} onKeyDown={event => { if (event.key === 'Escape') setConfirming(false); }} onSubmit={event => { if (window.matchMedia('(max-width: 640px)').matches && !confirming) { event.preventDefault(); setConfirming(true); } }}><button type="submit" className="guest-preview-logout" data-confirming={confirming ? 'true' : undefined} aria-label={confirming ? '로그아웃 하시겠습니까?' : '로그아웃'}><span className="guest-preview-logout-label">로그아웃</span><span className="guest-preview-mobile-identity">partner</span><span className="guest-preview-logout-question" aria-hidden="true">로그아웃 하시겠습니까?</span></button></form></div></div></header>
    <main className="staff-console guest-preview-main"><section className="guest-greeting" aria-label="인사말"><h1>안녕하세요 <strong>{name}</strong>님!</h1><div className="guest-greeting__summary"><p>이번 달 판매 금액은 <strong>{sales}</strong>이고,</p><p>이번 달 예상 정산 금액은 <strong>{money}</strong>입니다.</p></div></section>
      <div className="guest-record-records"><div className="guest-record-records-carousel" role="region" aria-label="판매 및 정산 내역">
        <div className="guest-record-records-carousel__track" ref={track} onScroll={event => { const node = event.currentTarget; if (node.clientWidth) setSlide(Math.max(0, Math.min(1, Math.round(node.scrollLeft / node.clientWidth)))); }}>
          <div className="guest-record-records-carousel__slide"><section className="graphic-inventory showroom-settlement" aria-label="판매 내역"><div className="showroom-sales-dialog__list"><article><strong>협업 티셔츠</strong><span>{sales}</span></article></div></section></div>
          <div className="guest-record-records-carousel__slide"><section className="guest-record-settlement-card" aria-label="정산 내역"><div className="guest-record-settlement-card__year"><strong>{year}년</strong></div><div className="guest-record-settlement-card__table-wrap"><table><thead><tr><th scope="col">정산 월</th><th scope="col">정산 금액</th><th scope="col">지급 상태</th></tr></thead><tbody><tr><td>{month}월</td><td>{money}</td><td>{paid ? '지급 완료' : '지급 대기'}</td></tr></tbody></table></div></section></div>
        </div><div className="guest-record-records-carousel__dots" aria-label="내역 선택">{['판매 내역', '정산 내역'].map((label, index) => <button key={label} type="button" className={slide === index ? 'is-active' : undefined} aria-label={`${label} 보기`} aria-current={slide === index ? 'true' : undefined} onClick={() => { track.current?.scrollTo({ left: index * track.current.clientWidth, behavior: 'smooth' }); setSlide(index); }} />)}</div>
      </div><div className="guest-record-stock-area"><section className="graphic-inventory showroom-products" aria-label="상품 재고"><div className="graphic-tabs guest-record-stock-tabs" role="tablist" aria-label="상품 종류">{['상의', '하의', '언더웨어', '기타'].map(label => <button role="tab" aria-selected={category === label} type="button" className={category === label ? 'is-active' : undefined} key={label} onClick={() => setCategory(label)}>{label}</button>)}</div><div className="graphic-card-grid">{category === '상의' ? <button type="button" className="graphic-card showroom-card guest-record-stock-card" onClick={() => setDetail(true)}><div className="graphic-card__image" /><div className="graphic-card__body"><strong className="showroom-card__name">협업 티셔츠</strong></div></button> : <div className="graphic-card-grid__empty guest-record-stock-empty" role="status"><strong>이 분류에 등록된 상품이 없습니다.</strong><p>다른 분류의 상품을 확인해 주세요.</p></div>}</div>{detail && <StockDetail close={() => setDetail(false)} />}</section></div></div>
    </main><footer className="public-footer" aria-label="페이지 하단"><div className="public-footer__inner"><p className="public-footer__copyright">© 2026 빈타제</p></div></footer>
  </div>;
}
