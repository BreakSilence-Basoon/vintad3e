import test from 'node:test';
import assert from 'node:assert/strict';
import { maxCsvBytes, parseInventoryCsv } from './inventory-csv.mjs';
const encode = text => new TextEncoder().encode(text);
test('reads valid UTF-8 CSV, quoted fields and an optional BOM', () => {
  assert.deepEqual(parseInventoryCsv(encode('\ufeffSKU,상품명,현재수량\r\nSHIRT-01,"셔츠, 검정",12\r\n')), [{ sku: 'SHIRT-01', name: '셔츠, 검정', quantity: 12 }]);
});
test('rejects personal-data columns, malformed rows, duplicates and unsafe quantities', () => {
  for (const text of ['SKU,상품명,현재수량,이메일\nX,옷,1,a', 'SKU,상품명,현재수량\nX,옷', 'SKU,상품명,현재수량\nX,옷,-1', 'SKU,상품명,현재수량\nX,옷,1.2', 'SKU,상품명,현재수량\nX,옷,1\nx,옷,2', 'SKU,상품명,현재수량\nX,"옷,1', 'SKU,상품명,현재수량\nX,"옷\n이름",1', 'SKU,상품명,현재수량\nX,옷,1000001']) assert.throws(() => parseInventoryCsv(encode(text)));
  assert.throws(() => parseInventoryCsv(new Uint8Array([0xff])));
  assert.throws(() => parseInventoryCsv(new Uint8Array(maxCsvBytes + 1)));
  assert.throws(() => parseInventoryCsv(encode('SKU,상품명,현재수량\n' + Array.from({ length: 501 }, (_, i) => `X${i},옷,1`).join('\n'))));
});
