// Adapted from shadcn/ui; source and MIT permission: ../../NOTICE.md.
import type * as React from 'react';
import { joinClasses } from '../lib/classes';

export type NativeSelectProps = React.ComponentProps<'select'> & { appearance?: 'field' | 'native' };

export function NativeSelect({ className, appearance = 'field', ...props }: NativeSelectProps) {
  return (
    <select
      data-slot="native-select"
      {...props}
      className={joinClasses(appearance === 'field' && 'field__control', className) || undefined}
    />
  );
}

// One native select, no icon/wrapper/appearance:none. Options/optgroups, size,
// multiple, required, selected value, disabled, ref and native keyboard survive.
