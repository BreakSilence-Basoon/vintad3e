import test from 'node:test';
import assert from 'node:assert/strict';
import { newPurchase, parsePurchases, applyPurchases } from './inventory-purchases.mjs';
const ingredients = [{ id:'ingredient-1', name:'재료 01', unit:'g' }];
const now = Date.parse('2026-11-20T00:00:00.000Z');
const make = status => newPurchase('가게 01','',status,'2026-11-19','12:00',['ingredient-1'],['25'],ingredients,now);
test('purchases require valid unique ingredients, positive quantities and safe text', () => {
  assert.ok(make('ORDERED'));
  assert.equal(newPurchase(' ','','ORDERED','2026-11-19','12:00',['ingredient-1'],['25'],ingredients,now),null);
  assert.equal(newPurchase('가게','','RECEIVED','2026-11-19','12:00',['ingredient-1'],['0'],ingredients,now),null);
  assert.equal(newPurchase('가게','','RECEIVED','2026-11-19','12:00',['ingredient-1','ingredient-1'],['1','1'],ingredients,now),null);
  assert.equal(parsePurchases('{',ingredients),null);
  assert.equal(parsePurchases(JSON.stringify([{...make('ORDERED'), extra:true}]),ingredients),null);
});
test('only purchases received after the last count change expected inventory', () => {
  const row = {id:'ingredient-1',countAt:'2026-11-18T00:00:00.000Z',expectedQuantity:100,used30:30};
  const ordered = make('ORDERED'), received = make('RECEIVED');
  assert.equal(applyPurchases([row],[ordered],now)[0].expectedQuantity,100);
  assert.equal(applyPurchases([row],[received],now)[0].expectedQuantity,125);
  assert.equal(applyPurchases([{...row,countAt:'2026-11-19T12:00:00.000Z'}],[received],now)[0].expectedQuantity,100);
  assert.equal(applyPurchases([row],[{...received,status:'VOID'}],now)[0].expectedQuantity,100);
  assert.equal(applyPurchases([{...row,expectedQuantity:null}],[received],now)[0].expectedQuantity,null);
});
