type BreakdownKey = 'referrer' | 'page' | 'country' | 'device' | 'browser' | 'os';
type ActionKey = 'loginJoin' | 'receive' | 'issueSuccess' | 'issueFailure' | 'shopMove' | 'guideOpen';
export type CouponSiteAnalytics =
  | { state: 'unconfigured' | 'not_collecting' | 'too_long' | 'unavailable' }
  | { state: 'ready'; start: string; end: string; visitors: number; pageviews: number;
      daily: { date: string; visitors: number; pageviews: number; receiveClicks: number; issueSuccess: number }[];
      breakdowns: Record<BreakdownKey, { name: string; share: number }[]>; actions: Record<ActionKey, number> };
