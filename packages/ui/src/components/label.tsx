// Adapted from shadcn/ui; native label preserves the existing DOM association.
import type * as React from 'react';
import { joinClasses } from '../lib/classes';
import { mappingReviewSlots } from '../slots';

export type LabelProps = React.ComponentProps<'label'> & {
  appearance?: 'field' | 'group' | 'native';
  layout?: 'mapping-review';
};

export function Label({ className, appearance = 'field', layout, style, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      {...props}
      style={layout === 'mapping-review' ? mappingReviewSlots.groupStyle : style}
      className={joinClasses(appearance === 'field' ? 'field__label' : appearance === 'group' ? 'field' : '', className) || undefined}
    />
  );
}
