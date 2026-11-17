// Ordinary CSS contract. Official @shadcn/lint does not inspect stylesheets.
// Approvals are declaration-specific; a file path never exempts its CSS.
export const SOURCE_BASE = 'withheld';
export const APPROVAL = 'docs/worklog/platform/2026-10-05-shadcn-shared-ui-decision.md';
// Exact extracted records and named retained slots, not a file-wide baseline.
export const SOURCE_REFERENCE_SHA256 = 'd39ba98c444887d0972eb1f6282badf1f63d20579f4cb5990bc3cdb5d164da85';

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

const exception = (profile, selector, property, value, slot, source) => ({
  profile, selector, property, value, slot, source, sourceBase: SOURCE_BASE,
  approval: APPROVAL, decisionOwner: 'withheld',
  interpretation: 'AI: 기존 외형 보존을 위해 관찰한 정확 선언을 named appearance로 추출',
});

const apparel = 'apps/apparel/src/app/globals.css';
const timetable = 'apps/timetable/src/app/globals.css';
const showroom = 'apps/apparel/src/app/admin/showroom/showroom.css';

// [운영 담당자 개발자] 기존 오른쪽 아래 알림의 구도와 2400/5000ms를 유지한다는 승인을 HQ가 전달했다.
// [AI 판단] 운영 담당자 개발자의 Codex: 아래 원본의 admin-toast 이름만 staff-toast로 바꿔 추출한다.
// 기존 controls의 SOURCE_BASE/APPROVAL을 이 새 추출의 근거로 재사용하지 않는다.
// [운영 담당자 개발자] 2026-11-07: 토스트 글자 배치 규칙으로 text-align·white-space·word-break 세 선언을 더해 두 해시를 갱신했다.
export const STAFF_TOAST_SOURCE = freeze({
  source: apparel,
  sourceBase: 'withheld',
  sourceBlockSha256: 'f7a9e8333f6630adeb282548a0ad74290272fffb17e630325896e963d3884ee6',
  sourceName: 'admin-toast',
  extractedName: 'staff-toast',
  approval: 'docs/worklog/platform/2026-10-10-staff-slide-toast.md',
  decisionOwner: 'withheld',
  interpretation: 'AI: 운영 담당자 개발자의 Codex가 승인된 기존 알림을 이름만 바꿔 추출',
});

const toastException = (selector, property, value, slot) => ({
  profile: 'toast', selector, property, value, slot,
  source: STAFF_TOAST_SOURCE.source,
  sourceBase: STAFF_TOAST_SOURCE.sourceBase,
  approval: STAFF_TOAST_SOURCE.approval,
  decisionOwner: STAFF_TOAST_SOURCE.decisionOwner,
  interpretation: STAFF_TOAST_SOURCE.interpretation,
});

// [운영 담당자 개발자] 2026-11-07(HQ 전달): 승인된 Supporters 화면의 raw 색은 packages/ui token으로 옮기고 앱 CSS는 token만 쓴다.
// [AI 판단] 운영 담당자 개발자의 Claude: #2150 37589d883의 정확한 색을 이름만 붙여 tokens.css로 추출했다. 새 색이 아니다.
export const SUPPORTERS_TOKEN_SOURCE = freeze({
  source: 'apps/supporters/src/app/globals.css',
  sourceBase: 'withheld',
  approval: 'PR #2099 승인(운영 담당자 개발자, 2026-11-07)',
  decisionOwner: 'withheld',
  interpretation: 'AI: 운영 담당자 개발자의 Claude가 승인된 Supporters 화면의 raw 색을 이름 붙인 token으로 추출',
});

const tokenException = (property, value, slot) => ({
  profile: 'tokens', selector: ':root', property, value, slot,
  source: SUPPORTERS_TOKEN_SOURCE.source,
  sourceBase: SUPPORTERS_TOKEN_SOURCE.sourceBase,
  approval: SUPPORTERS_TOKEN_SOURCE.approval,
  decisionOwner: SUPPORTERS_TOKEN_SOURCE.decisionOwner,
  interpretation: SUPPORTERS_TOKEN_SOURCE.interpretation,
});

export const COLOR_EXCEPTIONS = freeze([
  tokenException('--sns-instagram-gradient', 'linear-gradient(90deg, #833ab4 0%, #c13584 45%, #f77737 100%)', 'tokens.sns.instagram'),
  tokenException('--sns-tiktok-gradient', 'linear-gradient(90deg, #25c8d1 0%, #15171c 50%, #ee1d52 100%)', 'tokens.sns.tiktok'),
  tokenException('--control-focus', '#2a5746', 'tokens.control.focus'),
  tokenException('--chart-bar', '#2b644d', 'tokens.chart.bar'),
  tokenException('--border-strong', 'rgba(54, 44, 32, 0.2)', 'tokens.border.strong'),
  exception("library", ".button--ghost", "background", "rgba(255, 252, 248, 0.72)", "library.existing-color-1", "apps/library/src/app/globals.css"),
  exception("library", ".button--primary", "color", "#fffdf8", "library.existing-color-2", "apps/library/src/app/globals.css"),
  exception('controls', '.button--primary', 'color', '#f8f5ef', 'button.primary.text', apparel),
  exception('controls', '.button--primary', 'box-shadow', '0 8px 18px rgba(31, 52, 45, 0.14)', 'button.primary.shadow', apparel),
  exception('controls', '.button--ghost', 'background', 'rgba(255, 252, 248, 0.72)', 'button.ghost.surface', apparel),
  exception('controls', '.button--danger', 'border-color', 'rgba(160, 47, 33, 0.22)', 'button.danger.border', apparel),
  exception('controls', '.button--danger', 'color', '#8d2c20', 'button.danger.text', apparel),
  exception('controls', '.field__control', 'background', 'rgba(255, 253, 248, 0.92)', 'field.control.surface', apparel),
  exception('controls', '.field__helper', 'background', 'rgba(255, 253, 248, 0.92)', 'field.helper.surface', apparel),
  exception('controls', '.field__control:focus', 'outline', '2px solid rgba(32, 72, 62, 0.24)', 'field.control.focus', apparel),
  exception('timetable', '.button.kiosk-select-active', 'border-color', 'rgba(46, 125, 82, 0.26)', 'timetable.activeKioskStatus.border', timetable),
  exception('timetable', '.button.kiosk-select-active', 'background', 'rgba(46, 125, 82, 0.1)', 'timetable.activeKioskStatus.surface', timetable),
  exception('timetable', '.button.kiosk-select-active', 'color', '#2d6b47', 'timetable.activeKioskStatus.text', timetable),
  exception('showroom', '.graphic-inventory.showroom-settlement', 'border-color', '#566e65', 'settlement-sage.container.border', showroom),
  exception('showroom', '.graphic-inventory.showroom-settlement', 'background', '#566e65', 'settlement-sage.container.surface', showroom),
  exception('showroom', '.showroom-settlement .showroom-settlement__hint', 'color', 'rgba(255, 253, 248, 0.82)', 'settlement-sage.hint.cream', showroom),
  exception('showroom', '.showroom-settlement .showroom-settlement__hint.is-error', 'color', '#ffd9cc', 'settlement-sage.errorHint.peach', showroom),
  exception('showroom', '.showroom-settlement__hint.is-error', 'color', '#9d2e1d', 'settlement-sage.errorHint.fallback', showroom),
  exception('showroom', '.showroom-settlement__summary div', 'box-shadow', '0 6px 16px rgba(31, 52, 45, 0.16)', 'settlement-sage.summary.shadow', showroom),
  exception('showroom', '.showroom-settlement__summary .is-payout dd', 'color', '#c0501a', 'settlement-sage.payout.orange', showroom),
  toastException('.staff-toast', 'border', '1px solid #b8c4d8', 'toast.base.border'),
  toastException('.staff-toast', 'background', '#f6f8fb', 'toast.base.surface'),
  toastException('.staff-toast', 'color', '#2f4058', 'toast.base.text'),
  toastException('.staff-toast', 'box-shadow', '0 14px 32px rgb(0 0 0 / 14%)', 'toast.base.shadow'),
  toastException('.staff-toast--success', 'border-color', 'rgba(43, 74, 64, 0.28)', 'toast.success.border'),
  toastException('.staff-toast--success', 'background', '#f4fff5', 'toast.success.surface'),
  toastException('.staff-toast--success', 'color', '#1d5a30', 'toast.success.text'),
  toastException('.staff-toast--warning', 'border-color', '#d6a229', 'toast.warning.border'),
  toastException('.staff-toast--warning', 'background', '#fff7df', 'toast.warning.surface'),
  toastException('.staff-toast--warning', 'color', '#553b00', 'toast.warning.text'),
  toastException('.staff-toast--error', 'border-color', 'rgba(170, 36, 36, 0.28)', 'toast.error.border'),
  toastException('.staff-toast--error', 'background', '#fff5f1', 'toast.error.surface'),
  toastException('.staff-toast--error', 'color', '#9d2e1d', 'toast.error.text'),
]);

export const STYLESHEETS = freeze({
  "library": {"file":"packages/ui/src/styles/library.css","sha256":"be96f4afa29b0381145c7f040c642deb0588c9cb9b337e0839ad54a8f9c10b10"},
  "staff-web": {"file":"packages/ui/src/styles/staff-web.css","sha256":"4ad5540b4bf62b098cc208b336e729d0005f049fccd68e1ace6e6167cbbaa0cf"},
  controls: { file: 'packages/ui/src/styles/controls.css', sha256: '9a4c2a8c10b906dde2f656bcd3bd20765eeec8d67e1658cd664efec6956df154' },
  timetable: { file: 'packages/ui/src/styles/timetable.css', sha256: '1e5b67a7866fd58bf1aab6c55178a38fda2a27a1ba423dee98a97a8a6ffafd1b' },
  showroom: { file: 'packages/ui/src/styles/showroom.css', sha256: 'eb39d91ee8444b22bf70d1d7e7cd3eac6278b35474e5f0e20648c72ac46c77ac' },
  toast: {
    file: 'packages/ui/src/styles/toast.css',
    sha256: '41853813fa6cdbd62145022b585af9c63dc79ef8702a091f64b6752faca72f27',
    allowedKeyframes: ['staff-toast-in', 'staff-toast-out'],
  },
  // :root token만 담는 stylesheet. 앱 CSS는 var()·color-mix()로 쓰고 raw 색을 다시 적지 않는다.
  tokens: { file: 'packages/ui/src/styles/tokens.css', sha256: 'c8b7d17e7b3abf03d875dbdbd8c7b6a850ac594d37ade7683a35375d7d53b0b4' },
});

export const PRIMITIVES = freeze({
  Button: { tag: 'button', file: 'packages/ui/src/components/button.tsx', classes: ['button', 'button--primary', 'button--secondary', 'button--ghost', 'button--danger', 'button--small', 'button--timetable', 'graphic-dialog__transfer', 'schedule-calendar-page__icon-action', 'text-danger', 'guest-preview-logout', 'topbar__logout'] },
  Input: { tag: 'input', file: 'packages/ui/src/components/input.tsx', classes: ['field__control'] },
  Label: { tag: 'label', file: 'packages/ui/src/components/label.tsx', classes: ['field__label', 'field'] },
  NativeSelect: { tag: 'select', file: 'packages/ui/src/components/native-select.tsx', classes: ['field__control'] },
});

export const NAMED_SLOTS = freeze({
  showroomSettlementSlots: {
    variant: 'settlement-sage',
    container: 'graphic-inventory showroom-settlement',
    hint: 'showroom-settlement__hint',
    errorHint: 'showroom-settlement__hint is-error',
    summary: 'showroom-settlement__summary',
    payout: 'is-payout',
  },
  timetableSlots: {
    activeKioskStatus: 'button button--timetable button--ghost button--small kiosk-select-active',
  },
});

export function checkNamedSlots(slots) {
  const issues = [];
  if (!slots || Object.keys(slots).length !== Object.keys(NAMED_SLOTS).length) issues.push({ code: 'NAMED_SLOT_REGISTRY_CHANGED' });
  for (const [name, expected] of Object.entries(NAMED_SLOTS)) {
    const actual = slots?.[name];
    if (!actual || Object.keys(actual).length !== Object.keys(expected).length
      || Object.entries(expected).some(([slot, value]) => actual[slot] !== value)) issues.push({ code: 'NAMED_SLOT_CHANGED', name });
  }
  return issues;
}

// Separate from the frozen class-slot registry: exact native inline declarations
// have an element + property/value + consumer-source boundary, not a file waiver.
export const INLINE_SLOT_CONTRACTS = freeze({
  'mappingReviewSlots.groupStyle': {
    element: 'Label', appearance: 'group', layout: 'mapping-review',
    properties: { minWidth: 240, flex: '1 1 260px' },
    sources: ['apps/apparel/src/components/admin/cafe24-mapping-review-panel.tsx'],
    sourceBase: SOURCE_BASE, approval: APPROVAL,
    interpretation: 'AI: 기존 label.field의 정확 inline 배치를 보존',
  },
  'supportersFeedbackSlots.snsErrorStyle': {
    element: 'span', properties: { color: '#c0392b', fontSize: '0.72rem' },
    sources: ['apps/supporters/src/components/sns-sync-button.tsx', 'apps/supporters/src/components/disconnect-button.tsx'],
    sourceBase: SOURCE_BASE, approval: APPROVAL,
    interpretation: 'AI: 기존 native 오류 span의 정확 색과 크기를 보존',
  },
});

export function checkInlineSlotStyles(slots) {
  const issues = [];
  for (const [name, contract] of Object.entries(INLINE_SLOT_CONTRACTS)) {
    const [group, key] = name.split('.');
    const actual = slots?.[group]?.[key];
    if (!actual || Object.keys(actual).length !== Object.keys(contract.properties).length
      || Object.entries(contract.properties).some(([property, value]) => actual[property] !== value)) {
      issues.push({ code: 'INLINE_SLOT_CHANGED', name });
    }
  }
  return issues;
}

export function inlineSlotSourceAllowed(name, filename, element) {
  const contract = INLINE_SLOT_CONTRACTS[name];
  const file = normalizePath(filename);
  return !!contract && element === contract.element
    && contract.sources.some((source) => file === source || file.endsWith(`/${source}`));
}

// Main routes only. A detail view may have its own distinct business heading.
export const APPAREL_ROUTE_TITLES = freeze({
  'apps/apparel/src/app/admin/products/page.tsx': '인벤토리',
  'apps/apparel/src/app/admin/sales/page.tsx': '판매내역',
  'apps/apparel/src/app/admin/stats/page.tsx': '통계',
  'apps/apparel/src/app/admin/audit/page.tsx': '데이터 변경 이력',
  'apps/apparel/src/app/admin/support/page.tsx': '용어집',
});

export const UI_IMPORT = /^@vintad3e\/ui(?:$|\/components(?:$|\/))/;
export const DECORATIVE_CLASS = /(?:^|[\s_-])(?:eyebrow|kicker|overline)(?=$|[\s_-])/i;
export const normalizePath = (value) => value.replaceAll('\\', '/');
export const definitionNameFor = (filename) => {
  const path = normalizePath(filename);
  return Object.entries(PRIMITIVES).find(([, spec]) => path === spec.file || path.endsWith(`/${spec.file}`))?.[0];
};
