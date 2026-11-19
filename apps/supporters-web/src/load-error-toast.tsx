'use client';

import { useEffect } from 'react';
import { showStaffToast } from '@vintad3e/ui/toast';

export function LoadErrorToast({ message }: { message: string }) {
  useEffect(() => { showStaffToast(message.replace(/\.\s+(?=잠시 후|다시 시도)/, '.\n'), 'error'); }, [message]);
  return null;
}
