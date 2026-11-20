import test from 'node:test';
import assert from 'node:assert/strict';
import { createSettlementSelection, payoutAmount, toBusinessDayBounds } from './fixture-showroom-settlement.ts';
import { readSettlementForClient } from './fixture-settlement-client-read.ts';
test('synthetic settlement filters dates and applies the chosen percentage', async () => {
 const selection=createSettlementSelection([{code:'fixture-01',name:'협업처 01',defaultPercent:5}],{brandQuery:'협업처 01',range:'custom',customDates:{from:'2026-11-19',to:'2026-11-19'},percentInput:'',percentEdited:false});
 assert.ok(selection); assert.equal(selection.percent,5); assert.equal(payoutAmount(24690,5),1235);
 const result=await readSettlementForClient(new URLSearchParams({brand:selection.brandCode,...selection.bounds}),new AbortController().signal);
 assert.equal(result.kind,'ok'); if(result.kind==='ok') {assert.equal(result.value.totals.amount,24690);assert.equal(result.value.totals.quantity,2);}
 assert.equal(toBusinessDayBounds({from:'2026-11-20',to:'2026-11-19'}),null);
 const empty=await readSettlementForClient(new URLSearchParams({brand:'fixture-01',from:'2026-01-01T00:00:00+09:00',to:'2026-01-02T00:00:00+09:00'}),new AbortController().signal);
 assert.equal(empty.kind,'ok'); if(empty.kind==='ok') assert.equal(empty.value.totals.amount,0);
});
