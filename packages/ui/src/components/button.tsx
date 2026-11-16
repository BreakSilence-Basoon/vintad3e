// Adapted from shadcn/ui; source and MIT permission: ../../NOTICE.md.
import type * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { joinClasses } from '../lib/classes';

export const buttonVariants = cva('button', {
  variants: {
    variant: {
      default: '',
      primary: 'button--primary',
      secondary: 'button--secondary',
      ghost: 'button--ghost',
      danger: 'button--danger',
    },
    size: { default: '', small: 'button--small' },
    profile: { console: '', timetable: 'button--timetable', library: 'button--library' },
    appearanceSlot: {
      default: '',
      'graphic-transfer': 'graphic-dialog__transfer',
      'calendar-icon-action': 'schedule-calendar-page__icon-action',
      'text-danger': 'text-danger',
      'guest-logout': 'guest-preview-logout',
      'topbar-logout': 'topbar__logout',
    },
  },
  defaultVariants: { variant: 'default', size: 'default', profile: 'console' },
});

export type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, profile, appearanceSlot, ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      {...props}
      className={joinClasses(buttonVariants({ variant, size, profile, appearanceSlot }), className)}
    />
  );
}

// Deliberately no type="button", aria-busy, pending state, wrapper or asChild.
// The native submit default, disabled, ref and event handlers belong to callers.
