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

test("all period and sort choices preserve filters when loading another page", () => {
  for (const range of ["all", "today", "7d", "30d", "custom"]) {
    for (const sort of ["asc", "desc"]) {
      for (const keyword of ["", "쿠키"]) {
        const original = parseSalesFilters({ range, sort, keyword, from: "2026-09-25", to: "2026-09-26" });
        const url = new URL(buildSalesHref(2, original), "http://localhost");
        const restored = parseSalesFilters(Object.fromEntries(url.searchParams));
        assert.equal(restored.range, range);
        assert.equal(restored.sortDirection, sort);
        assert.equal(restored.keyword, keyword);
        assert.equal(url.searchParams.get("salesPage"), "2");
        if (range === "custom") {
          assert.equal(restored.from, "2026-09-25");
          assert.equal(restored.to, "2026-09-26");
        }
      }
    }
  }
});
