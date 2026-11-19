const transitions = { idle: { load: 'loaded' }, loaded: { load: 'loaded', review: 'reviewed' }, reviewed: { load: 'loaded', confirm: 'approved' }, approved: { load: 'approved' } };
export function nextConfirmationState(state, action) {
  if (!Object.hasOwn(transitions, state) || !Object.hasOwn(transitions[state], action)) return state;
  return transitions[state][action];
}
export function confirmationAvailable(now, proposalExpiry, presentationExpiry = proposalExpiry) {
  return Number.isFinite(now) && now < proposalExpiry && now < presentationExpiry;
}
