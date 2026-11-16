// Adapted from shadcn/ui; source and MIT permission: ../../NOTICE.md.
import type * as React from 'react';
import { joinClasses } from '../lib/classes';

export type InputProps = React.ComponentProps<'input'> & { appearance?: 'field' | 'native' };

export function Input({ className, appearance = 'field', ...props }: InputProps) {
  return (
    <input
      data-slot="input"
      {...props}
      className={joinClasses(appearance === 'field' && 'field__control', className) || undefined}
    />
  );
}

// Hidden inputs and app-specific inputs must explicitly choose native appearance.
