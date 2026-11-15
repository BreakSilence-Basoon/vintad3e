/** Return the two columns accepted by the public TimeTable staff table. */
export function toTimetableRows(fixture, businessId) {
  if (fixture?.schemaVersion !== 1 || fixture.synthetic !== true || !Array.isArray(fixture.staff)) {
    throw new TypeError('Expected a synthetic staff fixture');
  }
  if (typeof businessId !== 'string' || businessId.trim() !== businessId || !businessId) {
    throw new TypeError('Expected an explicit business identifier');
  }
  const ids = new Set();
  return fixture.staff.map((person) => {
    if (typeof person?.staffId !== 'string' || !person.staffId || ids.has(person.staffId)) {
      throw new TypeError('Expected distinct synthetic staff identifiers');
    }
    ids.add(person.staffId);
    return { business_id: businessId, id: person.staffId };
  });
}
