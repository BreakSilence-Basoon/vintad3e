// Development-only fixture: these links do not grant access to any application.
const fixtureLinks = Object.freeze({ timetable: 'http://127.0.0.1:3824/' });
/** @returns {Record<string, string>} */
export function fixturePortalLinks({ nodeEnv, enabled, grants }) {
  if (nodeEnv !== 'development' || enabled !== '1' || !Array.isArray(grants)) return {};
  const result = {};
  for (const grant of grants) {
    if (typeof grant === 'string' && Object.hasOwn(fixtureLinks, grant)) result[grant] = fixtureLinks[grant];
  }
  return result;
}
