import { APPROVAL, SOURCE_BASE, normalizePath } from './design-contract.mjs';

const googleSources = ['apparel', 'supporters', 'timetable', 'floor', 'library']
  .map((app) => `apps/${app}/src/app/sign-in/page.tsx`);
const entry = (value, element, sources, anchor) => Object.freeze({
  value, element, sources: Object.freeze(sources), anchor: Object.freeze(anchor),
  sourceBase: SOURCE_BASE, approval: APPROVAL,
  interpretation: '운영 담당자 개발자의 Codex: 기존 SVG의 정확한 fill과 요소 보존. 새 색상 승인 아님.',
});

export const SVG_FILL_CONTRACTS = Object.freeze({
  googleBlue: entry('#4285F4', 'path', googleSources, { d: 'M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.72v2.26h2.91c1.7-1.57 2.68-3.88 2.68-6.62Z' }),
  googleGreen: entry('#34A853', 'path', googleSources, { d: 'M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.83.86-3.05.86-2.35 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z' }),
  googleYellow: entry('#FBBC05', 'path', googleSources, { d: 'M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33Z' }),
  googleRed: entry('#EA4335', 'path', googleSources, {
    d: 'M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.65 3.58 9 3.58Z',
    // Library's original path differs. Preserve it; do not normalize the existing logo geometry.
    dBySource: Object.freeze({ 'apps/library/src/app/sign-in/page.tsx': 'M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.96l3-2.33C4.67 5.16 6.65 3.58 9 3.58Z' }),
  }),
  apparelPieHoverDim: entry('rgba(251,248,242,0.66)', 'path',
    ['apps/apparel/src/components/admin/apparel-pie.tsx'], { keyTemplatePrefix: 'hov-dim-' }),
  apparelSalesHoverBackground: entry('rgba(0,0,0,0.05)', 'rect',
    ['apps/apparel/src/components/admin/sales-overview-board.tsx'],
    { expressions: Object.freeze({ x: 'i*slot', y: 'TOP_PAD-4', width: 'slot', height: 'PLOT_H+4', rx: '4' }) }),
});

export function svgFillSourceAllowed(name, filename, element) {
  const spec = SVG_FILL_CONTRACTS[name], file = normalizePath(filename);
  return !!spec && element === spec.element
    && spec.sources.some((source) => file === source || file.endsWith(`/${source}`));
}

export function svgFillAnchorFor(name, filename) {
  const spec = SVG_FILL_CONTRACTS[name], file = normalizePath(filename);
  if (!spec) return null;
  const source = spec.sources.find((item) => file === item || file.endsWith(`/${item}`));
  if (!source) return null;
  return spec.anchor.dBySource?.[source] ? { ...spec.anchor, d: spec.anchor.dBySource[source] } : spec.anchor;
}

export function checkSvgFillSlots(slots) {
  return Object.keys(slots ?? {}).length === Object.keys(SVG_FILL_CONTRACTS).length
    && Object.entries(SVG_FILL_CONTRACTS).every(([name, spec]) => slots?.[name] === spec.value);
}
