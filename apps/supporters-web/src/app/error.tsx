'use client';
import { startTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  function retry() { startTransition(() => { router.refresh(); reset(); }); }
  return <main className="gtm-console"><section className="gtm-section" role="alert" data-route-error><p>화면을 불러오지 못했습니다. 다시 시도해 주세요.</p><button className="button button--ghost" type="button" onClick={retry}>다시 시도</button></section></main>;
}
