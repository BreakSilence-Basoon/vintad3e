import test from 'node:test';
import assert from 'node:assert/strict';
import { newRecipe, parseRecipes, recipesAt, applyRecipeUsage } from './inventory-recipes.mjs';
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
test('sales use the recipe effective at the sale, not a later revision',()=>{
 const first=newRecipe('음료 01',['ingredient-1'],['2'],ingredients,Date.parse('2026-11-01T00:00:00Z'));
 const later=newRecipe('음료 01',['ingredient-1'],['7'],ingredients,Date.parse('2026-11-10T00:00:00Z'));
 const history=[first,later]; assert.deepEqual(parseRecipes(JSON.stringify(history),ingredients),history);
 assert.equal(recipesAt(history,Date.parse('2026-11-20T00:00:00Z'))[0].ingredients[0].quantity,7);
 assert.equal(applyRecipeUsage([{id:'ingredient-1',used30:0}],history)[0].used30,20);
});
