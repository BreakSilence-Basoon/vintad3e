'use client';
import { Button } from '@vintad3e/ui/components';
import { AdminToastViewport, showAdminToast } from './admin-toast';

export function SalesEmptyToolbar() {
  return <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
      <div style={{ margin: 0, color: 'var(--foreground)', fontFamily: 'var(--font-body), sans-serif', fontSize: 'clamp(1.08rem, 1.2vw, 1.2rem)', fontWeight: 650, lineHeight: 1.85 }}>Toss 갱신 기록 없음</div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <form onSubmit={event => { event.preventDefault(); showAdminToast('Toss 동기화 실행에 실패했습니다.', 'error'); }}><input type="hidden" name="redirectTo" value="/admin/sales" /><input type="hidden" name="source" value="sales-tossplace-sync" /><Button type="submit" variant="primary" size="small" aria-busy={false}>수동 갱신</Button></form>
        <form onSubmit={event => { event.preventDefault(); showAdminToast('교차 검증 실행에 실패했습니다.', 'error'); }}><input type="hidden" name="redirectTo" value="/admin/sales" /><input type="hidden" name="source" value="sales-crosscheck-run" /><Button type="submit" variant="ghost" size="small">교차 검증 즉시 실행</Button></form>
      </div>
    </div><AdminToastViewport />
  </>;
}
