import type { ReactNode } from 'react';
import Link from 'next/link';
import '../internal-console-original.css';
import '@vintad3e/ui/styles/controls.css';
import '@vintad3e/ui/styles/toast.css';
import '@vintad3e/ui/styles/tokens.css';
import '../supporters-original.css';
export const metadata = { title: '빈타제 > Supporters > 쿠폰' };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="ko"><body><div className="supporters-page-content">{children}</div><footer className="public-footer" aria-label="공개 페이지 링크"><div className="public-footer__inner"><p className="public-footer__copyright">© 2026 빈타제</p><nav className="public-footer__nav" aria-label="법적 고지 / Legal"><Link href="/terms" aria-label="이용약관 · Terms · 利用規約"><span className="public-footer__label-full">이용약관 · Terms · 利用規約</span><span className="public-footer__label-short" aria-hidden="true">이용약관</span></Link><Link href="/privacy" aria-label="개인정보처리방침 · Privacy · プライバシー"><span className="public-footer__label-full">개인정보처리방침 · Privacy · プライバシー</span><span className="public-footer__label-short" aria-hidden="true">개인정보처리방침</span></Link></nav></div></footer></body></html>;
}
