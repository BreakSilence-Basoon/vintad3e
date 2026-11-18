'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

// [기존 정본] Supporters coupon-staff-selector의 native select와 compact 배치.
export function Selector({ label, value, options, path, parameter }: { label: string; value: string; options: readonly { value: string; label: string }[]; path: string; parameter: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState(value);
  const [pending, startTransition] = useTransition();
  return <div className="coupon-staff-stage coupon-staff-stage--compact"><div className="coupon-staff-selector"><select aria-label={label} aria-busy={pending || undefined} disabled={pending} value={pending ? selected : value} onChange={event => { const next = event.target.value; setSelected(next); startTransition(() => router.push(`${path}?${new URLSearchParams({ [parameter]: next })}`)); }}>{options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div></div>;
}
