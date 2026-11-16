// Named domain appearances retain existing selector specificity and DOM tags.
// These are class contracts, not replacement components or app business logic.
export const showroomSettlementSlots = Object.freeze({
  variant: 'settlement-sage',
  container: 'graphic-inventory showroom-settlement',
  hint: 'showroom-settlement__hint',
  errorHint: 'showroom-settlement__hint is-error',
  summary: 'showroom-settlement__summary',
  payout: 'is-payout',
});

export const timetableSlots = Object.freeze({
  // Existing element is span[role=status], not a disabled button.
  activeKioskStatus: 'button button--timetable button--ghost button--small kiosk-select-active',
});

// Exact source-derived declarations; not a general layout/color override API.
export const mappingReviewSlots = Object.freeze({
  groupStyle: Object.freeze({ minWidth: 240, flex: '1 1 260px' }),
});

export const supportersFeedbackSlots = Object.freeze({
  snsErrorStyle: Object.freeze({ color: '#c0392b', fontSize: '0.72rem' }),
});

// Source-bound SVG appearances: keep native fill strings, geometry and Google branding unchanged.
// svg-fill-contract.mjs limits each value to its original element and source location.
export const svgFillSlots = Object.freeze({
  googleBlue: '#4285F4',
  googleGreen: '#34A853',
  googleYellow: '#FBBC05',
  googleRed: '#EA4335',
  apparelPieHoverDim: 'rgba(251,248,242,0.66)',
  apparelSalesHoverBackground: 'rgba(0,0,0,0.05)',
});
