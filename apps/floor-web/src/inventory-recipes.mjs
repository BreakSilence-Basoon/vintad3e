import { parseCounts } from './inventory-counts.mjs';
const knownMenus = new Set(['음료 01']);
export function parseRecipes(text, ingredients) {
 if (text === null) return [];
 try {
  const records=JSON.parse(text);
  if(!Array.isArray(records)||records.length>knownMenus.size||new Set(records.map(record=>record?.menuName)).size!==records.length)return null;
  for(const record of records){
   if(!record||typeof record!=='object'||Array.isArray(record)||Object.keys(record).sort().join(',')!=='effectiveAt,id,ingredients,menuName'||!knownMenus.has(record.menuName))return null;
   const count={id:record.id,kind:'COUNT',status:'RECORDED',supplier:null,reference:null,occurredAt:record.effectiveAt,lines:record.ingredients};
   if(!parseCounts(JSON.stringify([count]),ingredients)||record.ingredients.some(part=>part.quantity<=0))return null;
  }
  return records;
 } catch { return null; }
}
export function newRecipe(menuName,ids,quantities,ingredients,now=Date.now()){
 if(!knownMenus.has(menuName)||ids.length!==quantities.length||quantities.some(value=>typeof value!=='string'||!/^\d+(?:\.\d{1,3})?$/.test(value)))return null;
 const record={id:'fixture-'+crypto.randomUUID(),menuName,ingredients:ids.map((ingredientId,index)=>({ingredientId,quantity:Number(quantities[index])})),effectiveAt:new Date(now).toISOString()};
 return parseRecipes(JSON.stringify([record]),ingredients)?.[0]??null;
}
