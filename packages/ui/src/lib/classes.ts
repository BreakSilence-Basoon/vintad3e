// No Tailwind merge: the existing ordinary-CSS classes and their order survive.
export function joinClasses(...values: Array<string | undefined | null | false>) {
  return values.filter((value): value is string => typeof value === 'string' && value.length > 0).join(' ');
}
