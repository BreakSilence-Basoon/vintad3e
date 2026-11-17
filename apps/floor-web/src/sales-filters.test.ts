import assert from "node:assert/strict";
import test from "node:test";
import { buildSalesHref, parseSalesFilters, parseSalesPage } from "./sales-filters.ts";

test("legacy source and cross-check status never filter Floor sales or persist in pagination", () => {
  const filters = parseSalesFilters({ source: "pos", status: "pending" });
  assert.deepEqual(filters, parseSalesFilters({}));
  assert.equal(buildSalesHref(2, filters), "/sales?salesPage=2");
});

test("custom Korean dates, keyword and ordering survive pagination", () => {
  const filters = parseSalesFilters({
    range: "custom", from: "2026-09-25", to: "2026-09-26",
    keyword: " 생맥주 ", sort: "asc", source: "pos", status: "matched",
  });
  assert.equal(filters.dateFrom?.toISOString(), "2026-09-24T15:00:00.000Z");
  assert.equal(filters.dateTo?.toISOString(), "2026-09-26T15:00:00.000Z");
  const url = new URL(buildSalesHref(2, filters), "http://localhost");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    range: "custom", from: "2026-09-25", to: "2026-09-26",
    keyword: "생맥주", sort: "asc", salesPage: "2",
  });
});

test("default filters reset to the sales route and pagination remains bounded", () => {
  assert.equal(buildSalesHref(1, parseSalesFilters({ range: "invalid", sort: "invalid" })), "/sales");
  assert.equal(parseSalesPage("-1"), 1);
  assert.equal(parseSalesPage("999999"), 200);
});
