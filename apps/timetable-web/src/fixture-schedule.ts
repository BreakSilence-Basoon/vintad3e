export const fixtureEmployees = [{ id: 'employee-1', displayName: '직원 01' }, { id: 'employee-2', displayName: '직원 02' }];
export const fixtureLocations = [{ id: 'location-1', label: '장소 01' }, { id: 'location-2', label: '장소 02' }];

export function fixtureSchedule(env: string | undefined, enabled: string | undefined, month: string) {
  if (env !== 'development' || enabled !== '1' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  return [8, 18].map((day, index) => ({ date: `${month}-${String(day).padStart(2, '0')}`, employee: fixtureEmployees[index], location: fixtureLocations[index] }));
}

export function filterFixtureSchedule(shifts: ReturnType<typeof fixtureSchedule>, employee: string, location: string) {
  return shifts.filter(shift => (!employee || shift.employee.id === employee) && (!location || shift.location.id === location));
}
