'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type QrScanner from 'qr-scanner';

type Phase = 'starting' | 'scanning' | 'submitting' | 'success' | 'error';
function cameraMessage(error: unknown) {
  if (!window.isSecureContext) return '카메라는 보안 연결에서만 사용할 수 있습니다.';
  if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) return '카메라 권한이 꺼져 있습니다. 브라우저 설정에서 Timetable의 카메라를 허용해주세요.';
  if (error instanceof DOMException && (error.name === 'NotFoundError' || error.name === 'OverconstrainedError')) return '사용할 수 있는 카메라가 없습니다.';
  if (error instanceof DOMException && (error.name === 'NotReadableError' || error.name === 'AbortError')) return '다른 앱이 카메라를 사용 중입니다. 다른 앱을 닫고 다시 시도해주세요.';
  return '카메라를 열지 못했습니다. 카메라 권한을 확인하고 다시 시도해주세요.';
}
export function FixtureScanner() {
  const video = useRef<HTMLVideoElement>(null), scanner = useRef<QrScanner | null>(null), mounted = useRef(false), busy = useRef(false), generation = useRef(0);
  const lastScan = useRef<{ token: string; time: number } | null>(null);
  const [phase, setPhase] = useState<Phase>('starting'), [error, setError] = useState(''), [notice, setNotice] = useState(''), [eventType, setEventType] = useState('');
  const decoded = useCallback(async (value: string) => {
    if (busy.current) return;
    let token = '';
    try { const url = new URL(value); if (url.origin !== window.location.origin || url.pathname !== '/scan') throw new Error(); token = url.searchParams.get('token') ?? ''; if (!/^[\w-]{32}$/.test(token)) throw new Error(); }
    catch { setNotice('QR 코드를 다시 확인해주세요.'); return; }
    if (lastScan.current?.token === token && Date.now() - lastScan.current.time < 1500) return;
    lastScan.current = { token, time: Date.now() };
    busy.current = true; setPhase('submitting');
    try {
      const response = await fetch('/api/fixture/kiosk/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
      if (!response.ok) { setNotice('QR 코드를 다시 확인해주세요.'); setPhase('scanning'); return; }
      const result = await response.json(); if (mounted.current) { setEventType(result.eventType); setPhase('success'); scanner.current?.stop(); }
    } catch { if (mounted.current) { setError('기록하지 못했습니다. 다시 시도해주세요.'); setPhase('error'); } }
    finally { busy.current = false; }
  }, []);
  const start = useCallback(async () => {
    const current = ++generation.current;
    setError(''); setNotice(''); setPhase('starting');
    try { if (!video.current) throw new Error(); scanner.current?.destroy(); const { default: Scanner } = await import('qr-scanner'); if (!mounted.current || generation.current !== current || !video.current) return; const instance = new Scanner(video.current, result => void decoded(result.data), { returnDetailedScanResult: true }); scanner.current = instance; await instance.start(); if (!mounted.current || generation.current !== current) { instance.destroy(); return; } setPhase('scanning'); }
    catch (caught) { if (mounted.current && generation.current === current) { setError(cameraMessage(caught)); setPhase('error'); } }
  }, [decoded]);
  useEffect(() => { mounted.current = true; void start(); return () => { mounted.current = false; generation.current++; scanner.current?.destroy(); scanner.current = null; }; }, [start]);
  return <section aria-busy={phase === 'starting' || phase === 'submitting'} aria-label="QR 코드 스캔" className={`employee-scanner employee-scanner--${phase}`}><Link aria-label="출근부로 돌아가기" className="employee-scanner__close" href="/?view=history"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6.4 6.4 11.2 11.2m0-11.2L6.4 17.6" /></svg></Link><div className="employee-scanner__camera"><video aria-label="QR 스캔 카메라 화면" autoPlay muted playsInline ref={video} /><div className="employee-scanner__frame" aria-hidden="true" />{(phase === 'starting' || phase === 'submitting') && <div className="employee-scanner__pending" aria-live="polite"><span className="employee-scanner__spinner" aria-hidden="true" />{phase === 'starting' ? '카메라 여는 중…' : '기록 중…'}</div>}</div><div className="employee-scanner__status">{phase === 'scanning' && <p role="status">{notice || 'QR 코드 발급 기기의 최신 QR을 사각형 안에 맞춰주세요.'}</p>}{phase === 'error' && <div className="employee-scanner__error"><p role="alert">{error}</p><button className="button button--primary" onClick={() => void start()} type="button">카메라 다시 켜기</button></div>}{phase === 'success' && <div className="employee-scanner__result" role="status"><span className="employee-scanner__check" aria-hidden="true">✓</span><strong>{eventType === 'CHECK_IN' ? '출근 완료' : '퇴근 완료'}</strong></div>}</div></section>;
}
