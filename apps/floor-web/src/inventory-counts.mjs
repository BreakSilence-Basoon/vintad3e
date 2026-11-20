const uuid = /^fixture-[0-9a-f-]{36}$/;
export function parseCounts(text, ingredients) {
 if (text === null) return []; try { const records=JSON.parse(text), ids=new Set(ingredients.map(item=>item.id));
 if (!Array.isArray(records) || records.length>100 || records.some(r => !r || !uuid.test(r.id) || r.kind!=='COUNT' || !['RECORDED','VOID'].includes(r.status) || typeof r.occurredAt!=='string' || !Number.isFinite(Date.parse(r.occurredAt)) || new Date(r.occurredAt).toISOString()!==r.occurredAt || !Array.isArray(r.lines) || !r.lines.length || r.lines.length>ids.size || r.lines.some(p=>!p || !ids.has(p.ingredientId) || typeof p.quantity!=='number' || !Number.isFinite(p.quantity) || p.quantity<0 || p.quantity>1_000_000 || Math.abs(Math.round(p.quantity*1000)-p.quantity*1000)>1e-7) || new Set(r.lines.map(p=>p.ingredientId)).size!==r.lines.length) || new Set(records.map(r=>r.id)).size!==records.length) return null; return records;
 } catch { return null; }
}
export function newCount(date,time,ids,quantities,ingredients,now=Date.now()) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time)) return null;
 const day=new Date(date+'T00:00:00.000Z'), when=new Date(date+'T'+time+':00+09:00');if(!Number.isFinite(day.getTime())||day.toISOString().slice(0,10)!==date||!Number.isFinite(when.getTime())||when.getTime()>now)return null;
 const records=[{id:'fixture-'+crypto.randomUUID(),kind:'COUNT',status:'RECORDED',supplier:null,reference:null,occurredAt:when.toISOString(),lines:ids.map((ingredientId,i)=>({ingredientId,quantity:Number(quantities[i])}))}];
 if(ids.length!==quantities.length || quantities.some(q=>typeof q!=='string' || !/^\d+(?:\.\d{1,3})?$/.test(q)))return null;return parseCounts(JSON.stringify(records),ingredients)?.[0]??null;
}
export function applyCounts(rows,counts,now=Date.now()) {
 return rows.map(row=>{const record=counts.filter(r=>r.status==='RECORDED' && Date.parse(r.occurredAt)<=now && r.lines.some(p=>p.ingredientId===row.id) && (!row.countAt || r.occurredAt>row.countAt)).sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt))[0];if(!record)return row;
 const qty=record.lines.find(p=>p.ingredientId===row.id).quantity, age=now-Date.parse(record.occurredAt);const usageAt=now-15*86400000,usedAfter=Date.parse(record.occurredAt)<usageAt?row.used30:0;const expected=age>366*86400000?null:Math.round((qty-usedAfter)*1000)/1000;return {...row,countQuantity:qty,countAt:record.occurredAt,expectedQuantity:expected,remainingDays:expected!==null && expected>=0 && row.used30>0 ? Math.round(expected/(row.used30/30)):null};});
}
