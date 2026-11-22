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

test("fractional and malformed page numbers fall back to the first page", () => {
  for (const value of ["0.5", "1.5", "2.0", "-1", "1e2", "Infinity", "", " 2 "]) {
    assert.equal(parseSalesPage(value), 1, value);
  }
  assert.equal(parseSalesPage("2"), 2);
  assert.equal(parseSalesPage("999999"), 200);
  assert.equal(parseSalesPage(["2", "3"]), 2);
});

test("invalid calendar dates are discarded instead of rolling into another month", () => {
  for (const day of ["2026-02-30", "2026-02-29", "2026-04-31", "2026-13-01"]) {
    const filters = parseSalesFilters({ range: "custom", from: day, to: day });
    assert.equal(filters.from, "", day);
    assert.equal(filters.to, "", day);
    assert.equal(filters.dateFrom, null, day);
    assert.equal(filters.dateTo, null, day);
    assert.equal(buildSalesHref(1, filters), "/sales?range=custom");
  }
  const leap = parseSalesFilters({ range: "custom", from: "2028-02-29", to: "2028-02-29" });
  assert.equal(leap.dateFrom?.toISOString(), "2028-02-28T15:00:00.000Z");
  assert.equal(leap.dateTo?.toISOString(), "2028-02-29T15:00:00.000Z");
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
