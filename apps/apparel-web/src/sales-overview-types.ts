export type SalesOverviewMonthRow = { onlineRevenueUnavailable?: boolean; unconvertedSaleCount?: number; month: string; storeRevenue: number; onlineRevenue: number; storeApparelRevenue: number; storeFnbRevenue: number; onlineApparelRevenue: number };
export type SalesOverviewOptionRow = { unconvertedRevenue?: boolean; revenueUnavailable?: boolean; skuCode: string | null; label: string; units: number; revenue: number };
export type SalesOverviewDesignRow = { unconvertedRevenue?: boolean; revenueUnavailable?: boolean; productCode: string | null; designName: string; units: number; revenue: number; options: SalesOverviewOptionRow[] };
export type SalesGrain = 'month' | 'week' | 'day' | 'hour';
export type SalesOverviewSeriesRow = { onlineRevenueUnavailable?: boolean; unconvertedSaleCount?: number; bucket: string; label: string; storeRevenue: number; onlineRevenue: number };
export type SalesOverviewData = {
  unconvertedCurrencyTotals: { currencyCode: string; amount: number | null; saleCount: number }[];
  onlineRevenueUnavailable: boolean;
  rangeFrom: string; rangeTo: string; availableFrom: string; availableTo: string;
  monthly: SalesOverviewMonthRow[]; grain: SalesGrain; series: SalesOverviewSeriesRow[];
  totals: { storeRevenue: number; onlineRevenue: number; storeApparelRevenue: number; storeFnbRevenue: number; onlineApparelRevenue: number };
  onlineApparelByDesign: SalesOverviewDesignRow[];
  onlineApparelOther: { unconvertedRevenue?: boolean; revenueUnavailable?: boolean; distinctCount: number; units: number; revenue: number } | null;
  storeApparelByDesign: SalesOverviewDesignRow[];
  storeApparelOther: { distinctCount: number; units: number; revenue: number } | null;
};
