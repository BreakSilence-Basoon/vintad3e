import { parseCounts } from './inventory-counts.mjs';
const knownMenus = new Set(['음료 01']);
export function parseRecipes(text, ingredients) {
 if (text === null) return [];
 try {
  const records=JSON.parse(text);
  if(!Array.isArray(records)||records.length>100||new Set(records.map(record=>record?.id)).size!==records.length)return null;
  for(const record of records){
   if(!record||typeof record!=='object'||Array.isArray(record)||Object.keys(record).sort().join(',')!=='effectiveAt,id,ingredients,menuName'||!knownMenus.has(record.menuName))return null;
   const count={id:record.id,kind:'COUNT',status:'RECORDED',supplier:null,reference:null,occurredAt:record.effectiveAt,lines:record.ingredients};
   if(!parseCounts(JSON.stringify([count]),ingredients)||record.ingredients.some(part=>part.quantity<=0))return null;
  }
  return records;
 } catch { return null; }
}
export function recipesAt(recipes, when) {
 const latest=new Map();
 for(const recipe of recipes) if(Date.parse(recipe.effectiveAt)<=when) {const prior=latest.get(recipe.menuName);if(!prior||recipe.effectiveAt>=prior.effectiveAt)latest.set(recipe.menuName,recipe);}
 return [...latest.values()];
}
export function applyRecipeUsage(rows, recipes) {
 const saleAt=Date.parse('2026-11-05T00:00:00.000Z'), recipe=recipesAt(recipes,saleAt).find(item=>item.menuName==='음료 01');
 return rows.map(row=>({...row,used30:Math.round((recipe?.ingredients.find(part=>part.ingredientId===row.id)?.quantity??0)*10*1000)/1000}));
}
export function newRecipe(menuName,ids,quantities,ingredients,now=Date.now()){
 if(!knownMenus.has(menuName)||ids.length!==quantities.length||quantities.some(value=>typeof value!=='string'||!/^\d+(?:\.\d{1,3})?$/.test(value)))return null;
 const record={id:'fixture-'+crypto.randomUUID(),menuName,ingredients:ids.map((ingredientId,index)=>({ingredientId,quantity:Number(quantities[index])})),effectiveAt:new Date(now).toISOString()};
 return parseRecipes(JSON.stringify([record]),ingredients)?.[0]??null;
}
