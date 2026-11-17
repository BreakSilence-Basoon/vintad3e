export function timetableInitialView(view: string | string[] | undefined): 'history' | 'schedule' {
  return view === 'schedule' ? 'schedule' : 'history';
}
