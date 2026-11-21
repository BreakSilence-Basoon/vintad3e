export function timetableInitialView(view: string | string[] | undefined): 'history' | 'schedule' {
  return (Array.isArray(view) ? view[0] : view) === 'schedule' ? 'schedule' : 'history';
}
