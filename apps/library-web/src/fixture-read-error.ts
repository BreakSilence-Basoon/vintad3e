export function fixtureReadError(env: NodeJS.ProcessEnv) {
  return env.NODE_ENV === 'development' && env.VINTAD3E_LIBRARY_FIXTURE === '1' && env.VINTAD3E_LIBRARY_ACTIVITY_STATE === 'error';
}
