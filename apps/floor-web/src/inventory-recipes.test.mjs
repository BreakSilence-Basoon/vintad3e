import test from 'node:test';
import assert from 'node:assert/strict';
import { newRecipe, parseRecipes } from './inventory-recipes.mjs';
const ingredients=[{id:'ingredient-1',name:'재료 01',unit:'g'}];
test('recipe requires a known menu and unique positive quantities',()=>{
 const item=newRecipe('음료 01',['ingredient-1'],['3.25'],ingredients,Date.parse('2026-11-20T00:00:00Z'));
 assert.ok(item);assert.equal(item.effectiveAt,'2026-11-20T00:00:00.000Z');assert.deepEqual(parseRecipes(JSON.stringify([item]),ingredients),[item]);
 assert.equal(newRecipe('없는 메뉴',['ingredient-1'],['1'],ingredients),null);
 assert.equal(newRecipe('음료 01',['ingredient-1'],['0'],ingredients),null);
 assert.equal(newRecipe('음료 01',['ingredient-1','ingredient-1'],['1','2'],ingredients),null);
 assert.equal(parseRecipes(JSON.stringify([item,item]),ingredients),null);
 assert.equal(parseRecipes('{bad',ingredients),null);
});
