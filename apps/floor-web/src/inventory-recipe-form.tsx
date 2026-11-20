'use client';
import { useState } from 'react';
import { Button } from '@vintad3e/ui/components';
import { newRecipe } from './inventory-recipes.mjs';
import type { InventoryData } from './inventory-fixture';
type Recipe = InventoryData['recipes'][number];
export function InventoryRecipeForm({ ingredients, disabled, save }: { ingredients:InventoryData['ingredients']; disabled:boolean; save:(recipe:Recipe)=>boolean }) {
 const [keys,setKeys]=useState([0]),[message,setMessage]=useState('');
 return <details className="inventory-editor"><summary>메뉴별 재료 설정</summary><form className="inventory-form" onSubmit={event=>{event.preventDefault();const form=event.currentTarget,fields=new FormData(form);const recipe=newRecipe(String(fields.get('menu')??''),fields.getAll('ingredientId').map(String),fields.getAll('quantity').map(String),ingredients);if(!recipe||!save(recipe)){setMessage('입력값을 확인해주세요.');return;}form.reset();setKeys([0]);setMessage('저장했습니다.');}}><fieldset disabled={disabled}>
 <label>메뉴<select name="menu" required defaultValue=""><option value="" disabled>판매된 메뉴 선택</option><option value="음료 01">음료 01 · 음료</option></select></label><p>메뉴 한 개에 들어가는 양을 입력해주세요. 저장한 시점 이후 판매부터 적용하며, 다시 저장하면 그 메뉴의 재료 구성을 바꿉니다.</p><div className="inventory-parts">{keys.map((key,index)=><div className="inventory-part" key={key}><label>재료<select name="ingredientId" required defaultValue=""><option value="" disabled>재료 선택</option>{ingredients.map(item=><option key={item.id} value={item.id}>{item.name} ({item.unit==='ea'?'개':item.unit})</option>)}</select></label><label>수량<input name="quantity" type="number" min="0.001" step="0.001" required /></label>{index>0 && <Button type="button" variant="default" size="small" profile="timetable" onClick={()=>setKeys(keys.filter(item=>item!==key))}>빼기</Button>}</div>)}<Button type="button" variant="default" size="small" profile="timetable" disabled={keys.length>=ingredients.length} onClick={()=>setKeys([...keys,Math.max(...keys)+1])}>재료 추가</Button></div><Button type="submit" variant="primary" profile="timetable">저장</Button></fieldset><p role="status">{message}</p></form></details>;
}
