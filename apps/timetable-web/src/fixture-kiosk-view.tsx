'use client';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TimetableSlideSwitcher } from './timetable-slide-switcher';

type Device = { id: string; label: string };
type Challenge = { token: string; expiresAt: number; device: Device };
const kioskKey = 'vintad3e-timetable-fixture-kiosk';
function selectDevice(id: string) { localStorage.setItem(kioskKey, id); document.cookie = `vintad3e-kiosk-device=${id}; Path=/; SameSite=Strict`; }
function clearDevice() { localStorage.removeItem(kioskKey); document.cookie = 'vintad3e-kiosk-device=; Path=/; Max-Age=0; SameSite=Strict'; }

export function FixtureKioskSetupReturn() {
  const router = useRouter();
  useEffect(() => { if (localStorage.getItem(kioskKey)) router.replace('/kiosk'); }, [router]);
  return null;
}
async function post(action: string, body: object) { return fetch(`/api/fixture/kiosk/${action}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); }

export function FixtureKioskBoard({ embedded = false, deviceId }: { embedded?: boolean; deviceId?: string }) {
  const router = useRouter();
  const [challenge, setChallenge] = useState<Challenge | null>(null), [now, setNow] = useState(0), [failed, setFailed] = useState(false);
  const refreshing = useRef(false);
  const refresh = useCallback(async () => {
    const id = deviceId ?? localStorage.getItem(kioskKey);
    if (!id) { if (!embedded) router.replace('/kiosk/setup'); else setFailed(true); return; }
    if (refreshing.current) return;
    refreshing.current = true;
    try { const response = await post('challenge', { id }); if (!response.ok) { setFailed(true); return; } setChallenge(await response.json()); setNow(Date.now()); setFailed(false); } catch { setFailed(true); } finally { refreshing.current = false; }
  }, [deviceId, embedded, router]);
  useEffect(() => { void refresh(); const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [refresh]);
  useEffect(() => { if (challenge && now >= challenge.expiresAt) void refresh(); }, [challenge, now, refresh]);
  if (failed) return <section className="kiosk-qr-state kiosk-qr-state--error" role="status"><strong>먼저 QR 코드 발급 기기로 등록해주세요</strong></section>;
  if (!challenge) return <section className="kiosk-qr-state" aria-busy="true" aria-labelledby="kiosk-qr-title"><h1 className="sr-only" id="kiosk-qr-title">출퇴근 QR 코드</h1><div className="qr-placeholder" /><p>안전한 QR 코드를 만드는 중입니다.</p></section>;
  const remaining = Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000));
  const url = `${window.location.origin}/scan?token=${encodeURIComponent(challenge.token)}`;
  return <section className={`kiosk-qr-shell${embedded ? ' kiosk-qr-shell--embedded' : ''}`} aria-labelledby="kiosk-qr-title"><h1 className="sr-only" id="kiosk-qr-title">출퇴근 QR 코드</h1><div className="kiosk-qr-content"><div className="kiosk-qr-code"><QRCodeSVG value={url} size={384} level="H" marginSize={3} bgColor="#ffffff" fgColor="#211910" title="출퇴근 인증 QR 코드" /></div><div className="kiosk-qr-meta"><strong>{challenge.device.label}</strong><span className={remaining <= 5 ? 'is-expiring' : undefined}>{remaining > 0 ? `${remaining}초 뒤 자동 갱신` : '새 QR로 갱신 중'}</span></div></div></section>;
}

export function FixtureKioskAdmin({ initialView }: { initialView: string }) {
  const [devices, setDevices] = useState<Device[]>([]), [label, setLabel] = useState(''), [current, setCurrent] = useState(''), [error, setError] = useState('');
  const refresh = useCallback(async () => { try { const response = await fetch('/api/fixture/kiosk/list', { cache: 'no-store' }); if (!response.ok) throw new Error(); const data = await response.json(); setDevices(data.devices); } catch { setError('기기 목록을 불러오지 못했습니다.'); } }, []);
  useEffect(() => { setCurrent(localStorage.getItem(kioskKey) ?? ''); void refresh(); }, [refresh]);
  async function register(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); try { const response = await post('register', { label }); if (!response.ok) throw new Error(); const device = await response.json(); selectDevice(device.id); setCurrent(device.id); setLabel(''); setError(''); await refresh(); } catch { setError('기기를 등록하지 못했습니다.'); } }
  async function revoke(id: string) { try { const response = await post('revoke', { id }); if (!response.ok) throw new Error(); if (current === id) { clearDevice(); setCurrent(''); } await refresh(); } catch { setError('기기를 해제하지 못했습니다.'); } }
  const deviceManagement = <section aria-label="QR 발급 기기 관리" className="admin-section admin-section--kiosks"><form autoComplete="off" className="form-grid kiosk-registration-form" onSubmit={register}><label><span className="sr-only">기기 이름</span><input type="text" name="label" value={label} onChange={event => setLabel(event.target.value)} placeholder="신규 등록할 기기의 이름을 입력하세요" required maxLength={100} disabled={devices.length >= 5} /></label><div className="form-grid__actions"><button className="button button--primary" type="submit" disabled={devices.length >= 5}>등록</button></div></form><ul aria-label="등록된 기기 목록" className="plain-list kiosk-device-list">{devices.length ? devices.map(device => <li key={device.id}><span><strong>{device.label}</strong></span><div className="plain-list__actions"><button className="button button--ghost button--small" type="button" onClick={() => { selectDevice(device.id); setCurrent(device.id); }}>{current === device.id ? '활성화' : '선택'}</button><button className="button button--ghost button--small" type="button" onClick={() => void revoke(device.id)}>해제</button></div></li>) : <li className="plain-list__empty">등록된 QR 코드 발급 기기가 없습니다.</li>}</ul><p className="kiosk-capacity-count" aria-label={`등록된 기기 ${devices.length}대, 최대 5대`}>{devices.length}/5</p>{error && <div className="flash flash--error kiosk-page-feedback" role="alert">{error}</div>}</section>;
  const qrBoard = <section className="kiosk-qr-embedded" aria-label="QR 코드 발급">{current ? <FixtureKioskBoard key={current} embedded deviceId={current} /> : <div className="kiosk-qr-state kiosk-qr-state--error" role="status"><strong>먼저 QR 코드 발급 기기로 등록해주세요</strong></div>}</section>;
  return <main className="app-shell timetable-console kiosk-admin-shell"><TimetableSlideSwitcher ariaLabel="QR 발급과 기기 관리" initialSlide={initialView} slides={[{ key: 'qr', label: 'QR 발급', content: qrBoard }, { key: 'devices', label: '기기 관리', content: deviceManagement }]} /></main>;
}
