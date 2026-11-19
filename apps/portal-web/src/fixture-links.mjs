// Development-only fixture: these links do not grant access to any application.
const fixtureLinks = Object.freeze({ timetable: 'http://127.0.0.1:3824/', apparel: 'http://127.0.0.1:3826/', supporters: 'http://127.0.0.1:3827/coupon', partners: 'http://127.0.0.1:3828/', library: 'http://127.0.0.1:3829/', floor: 'http://127.0.0.1:3830/', creative: 'http://127.0.0.1:3831/', admin: 'http://127.0.0.1:3832/members' });
export const fixtureAppIds = Object.freeze(Object.keys(fixtureLinks));
/** @returns {Record<string, string>} */
export function fixturePortalLinks({ nodeEnv, enabled, grants }) {
  if (nodeEnv !== 'development' || enabled !== '1' || !Array.isArray(grants)) return {};
  const result = {};
  for (const grant of grants) {
    if (typeof grant === 'string' && Object.hasOwn(fixtureLinks, grant)) result[grant] = fixtureLinks[grant];
  }
  return result;
}
