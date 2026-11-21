'use client';
import { useEffect, useState } from 'react';
import { FixtureObjectConfirmation } from './fixture-object-confirmation-view';
import { FixtureIrConfirmation } from './fixture-ir-confirmation-view';

export function FixtureConfirmationRecovery({ proposalId }: { proposalId: string }) {
  const [kind, setKind] = useState<'object' | 'ir' | null>(null);
  useEffect(() => {
    let live = true;
    async function resolve() {
      try {
        if (sessionStorage.getItem(`vintad3e-library-ir-recovery:${proposalId}`)) { if (live) setKind('ir'); return; }
        if (sessionStorage.getItem(`vintad3e-library-object-recovery:${proposalId}`)) { if (live) setKind('object'); return; }
        const response = await fetch(`/api/fixture/ir-confirmation?proposalId=${encodeURIComponent(proposalId)}`, { cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal: AbortSignal.timeout(15000) });
        if (live) setKind(response.ok ? 'ir' : 'object');
      } catch { if (live) setKind('object'); }
    }
    void resolve(); return () => { live = false; };
  }, [proposalId]);
  return kind === 'ir' ? <FixtureIrConfirmation proposalId={proposalId} /> : kind === 'object' ? <FixtureObjectConfirmation proposalId={proposalId} /> : null;
}
