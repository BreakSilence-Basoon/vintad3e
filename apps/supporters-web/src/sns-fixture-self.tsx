'use client';
import { useEffect, useState } from 'react';
import { Button } from '@vintad3e/ui/components';
import { showStaffToast } from '@vintad3e/ui/toast';
import { SnsPerformanceTable, type SnsPerformanceReport } from './sns-performance-table';
import { readConnection, writeConnection, readSync, writeSync, type Platform } from './sns-fixture-storage';

export function SnsFixtureSelf({ platform, reports }: { platform: Platform; reports: SnsPerformanceReport[] }) {
  const name = platform === 'instagram' ? 'Instagram' : 'TikTok';
  const [connected, setConnected] = useState<boolean | null>(true);
  const [loaded, setLoaded] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  useEffect(() => { let value: boolean | null = null; try { value = readConnection(sessionStorage, platform); setSyncedAt(readSync(sessionStorage, platform)); } catch {} setConnected(value); if (value === null) showStaffToast(`${name} 계정 연결 상태를 불러오지 못했습니다.`, 'error'); setLoaded(true); }, [platform, name]);
  function changeConnection(next: boolean) {
    try { if (writeConnection(sessionStorage, platform, next)) { setConnected(next); if (next) showStaffToast(`${name} 계정이 연결되었습니다.`, 'success'); return; } } catch {}
    showStaffToast(next ? `${name} 계정을 연결하지 못했습니다. 다시 시도해 주세요.` : '연결 해제 결과를 확인하지 못했습니다.\n잠시 후 연결 상태를 확인해 주세요.', 'error');
  }
  if (connected === null) return null;
  if (!connected) return <section className="gtm-section gtm-section--connect"><p>계정 연결 후 {platform === 'instagram' ? '게시물' : '영상'} 목록에서 성과 집계에 포함할 게시물을 직접 선택합니다.</p><a href={`/api/${platform}/start`} className="button button--primary" onClick={event => { event.preventDefault(); if (loaded) changeConnection(true); }}>계정 연결</a></section>;
  const syncedReports = syncedAt ? reports.map((report, index) => index === 0 && typeof report.views === 'number' ? { ...report, views: report.views + 100 } : report) : reports;
  return <><div className="gtm-sync-toolbar"><p className="gtm-sync-basis">{syncedAt ? <>{new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'long', timeStyle: 'short' }).format(new Date(syncedAt))} <span>(수동 갱신)</span> 기준</> : `${name} 동기화 기록 없음`}</p><div className="gtm-page__actions"><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Button type="button" disabled={!loaded} variant="primary" size="small" onClick={() => { try { const value = writeSync(sessionStorage, platform, new Date()); if (value) { setSyncedAt(value); showStaffToast('전체 항목의 수집 여부는 확인할 수 없습니다. 페이지를 새로고침해 주세요.', 'error'); return; } } catch {} showStaffToast('동기화하지 못했습니다. 저장된 결과를 다시 확인해 주세요.', 'error'); }}>수동 갱신</Button></span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Button type="button" disabled={!loaded} variant="ghost" size="small" onClick={() => { if (window.confirm(`${name} 연결을 해제할까요?`)) changeConnection(false); }}>연결 해제</Button></span></div></div><section className="gtm-section gtm-section--sns-table"><SnsPerformanceTable platform={platform} reports={syncedReports} isOfficial={false} loadError={null} /></section></>;
}
