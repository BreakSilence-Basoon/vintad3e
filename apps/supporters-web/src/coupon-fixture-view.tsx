'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { showStaffToast } from '@vintad3e/ui/toast';
import { fixtureCouponLink, type CouponFixture } from './coupon-fixture';

const malls = [{ name:'국내', value:'korea', available:true }, { name:'일본', value:'japan', available:true }, { name:'글로벌', value:'global', available:false }] as const;
const languages = [{ name:'자동', value:null, available:true }, { name:'한국어', value:'ko', available:true }, { name:'日本語', value:'ja', available:true }, { name:'English', value:null, available:false }] as const;
function CopyIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1" /></svg>; }

export function CouponFixtureView({ fixtures, selected }: { fixtures: CouponFixture[]; selected?: CouponFixture }) {
  const router = useRouter();
  const [value, setValue] = useState(selected?.id ?? '');
  const [pending, startTransition] = useTransition();
  useEffect(() => { setValue(selected?.id ?? ''); }, [selected?.id]);
  async function copy(value: string, message: string) {
    try { await navigator.clipboard.writeText(value); showStaffToast(message); }
    catch { showStaffToast('복사하지 못했습니다. 다시 시도해 주세요.', 'error'); }
  }
  const count = (value: number) => `${value.toLocaleString()}건`;
  return <>
    <div className="coupon-staff-stage" data-empty={!selected}><div className="coupon-staff-selector"><select id="coupon-staff" aria-label="직원 선택" aria-busy={pending || undefined} disabled={pending} value={value} onChange={event => { const next = event.target.value; setValue(next); startTransition(() => router.push(`/coupon?${new URLSearchParams({ staff: next })}`)); }}><option value="">직원을 선택해 주세요</option>{fixtures.map(member => <option key={member.id} value={member.id}>{member.displayName || '이름 없음'}</option>)}</select></div></div>
    {selected?.hasUsage ? <div className="coupon-types coupon-types--viewer">
      <section className="coupon-type" aria-label="추천인 코드"><div className="coupon-code-block"><div className="coupon-share-field"><span>추천인 코드</span><div><strong>{selected.code}</strong><button type="button" onClick={() => copy(selected.code, '추천인 코드를 복사했습니다.')} aria-label="추천인 코드 복사" title="추천인 코드 복사"><CopyIcon /></button></div></div></div><dl className="coupon-stats"><div><dt>이번 달</dt><dd>{count(selected.referralMonth)}</dd></div><div><dt>누적 사용</dt><dd>{count(selected.referralTotal)}</dd></div></dl></section>
      <section className="coupon-type" aria-label="회원 전용 쿠폰 발급 링크"><div className="coupon-type__heading"><h2>회원 전용 쿠폰 발급 링크</h2></div><div className="coupon-link-table-wrap"><table className="coupon-link-table" aria-label="개인 발급 쿠폰 링크 복사"><thead><tr><th scope="col">쇼핑몰</th>{languages.map(lang => <th scope="col" key={lang.name}>{lang.name}</th>)}</tr></thead><tbody>{malls.map(mall => <tr key={mall.value}><th scope="row">{mall.name}</th>{languages.map(lang => { const label = `${mall.name} · ${lang.name}`; const available = mall.available && lang.available; return <td key={lang.name}><button type="button" disabled={!available} aria-label={`${label} 링크 ${available ? '복사' : '사용 불가'}`} title={available ? `${label} 링크 복사` : `${label} 링크 사용 불가`} onClick={() => { if (mall.value !== 'global' && available) void copy(fixtureCouponLink(mall.value, lang.value), `${label} 링크를 복사했습니다.`); }}><CopyIcon /></button></td>; })}</tr>)}</tbody></table></div><dl className="coupon-stats"><div><dt>이번 달</dt><dd>{count(selected.personalMonth)}</dd></div><div><dt>누적 사용</dt><dd>{count(selected.personalTotal)}</dd></div></dl></section>
    </div> : null}

  </>;
}
