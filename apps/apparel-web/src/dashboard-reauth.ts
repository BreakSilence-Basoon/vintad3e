
/** Fired synchronously right before the home leaves for reauthentication. */
export const HOME_REAUTH_EVENT = 'vintad3e:apparel-home-reauth';

const STORAGE_KEY = 'vintad3e:apparel-home-reauth-state';
const MAX_AGE_MS = 60 * 60 * 1000;
const DRAFT_FIELDS = ['onHandQty', 'targetQty', 'shortageQty', 'workQty'] as const;

export type HomeReauthRowDraft = {
  rowId: string;
  draft: Record<(typeof DRAFT_FIELDS)[number], string>;
  /** The version this input was typed against, so a save still detects a change made meanwhile. */
  updatedAt: string | null;
};

export type HomeReauthState = {
  productId: string;
  tab: 'shortage' | 'normal' | 'all';
  rows: HomeReauthRowDraft[];
};

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function isRowDraft(value: unknown): value is HomeReauthRowDraft {
  if (!value || typeof value !== 'object') return false;
  const { rowId, draft, updatedAt } = value as Record<string, unknown>;
  return typeof rowId === 'string' && (updatedAt === null || typeof updatedAt === 'string') &&
    Boolean(draft) && typeof draft === 'object' &&
    DRAFT_FIELDS.every(field => typeof (draft as Record<string, unknown>)[field] === 'string');
}

export function saveHomeReauthState(storage: BrowserStorage, owner: string | null, state: HomeReauthState, nowMs: number) {
  if (!owner) return;
  try { storage.setItem(STORAGE_KEY, JSON.stringify({ owner, savedAtMs: nowMs, state })); }
  catch { /* Storage is best effort: the existing reauthentication still proceeds. */ }
}

/** One-shot: whatever is stored leaves storage here, used or not. */
export function takeHomeReauthState(storage: BrowserStorage, owner: string | null, nowMs: number): HomeReauthState | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    storage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw) as { owner?: unknown; savedAtMs?: unknown; state?: Partial<HomeReauthState> };
    const age = nowMs - Number(parsed.savedAtMs);
    const state = parsed.state;
    if (!owner || parsed.owner !== owner || !(age >= 0 && age < MAX_AGE_MS) || !state ||
      typeof state.productId !== 'string' || !['shortage', 'normal', 'all'].includes(state.tab as string) ||
      !Array.isArray(state.rows) || !state.rows.every(isRowDraft)) return null;
    return state as HomeReauthState;
  } catch { return null; }
}
