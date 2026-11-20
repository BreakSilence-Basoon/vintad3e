import { fixtureHome } from './fixture-home.ts';
export function searchFixture(env:string|undefined,enabled:string|undefined,q:string,period:string,author:string,now:number) {
 if(env!=='development'||enabled!=='1'||q.length>100||!['all','week','month','year'].includes(period)||author.length>100||!Number.isFinite(now))return null;
 const items=fixtureHome(env,enabled,'').filter(item=>/^\/(?:objects|publications)\/[a-zA-Z0-9%_-]+$/.test(item.href));
 const authors=[...new Set(items.map(item=>item.publisher).filter(Boolean))]; const days:Record<string,number>={week:7,month:30,year:365};
 const results=items.filter(item=>item.title.toLocaleLowerCase('ko').includes(q.trim().toLocaleLowerCase('ko'))&&(!author||item.publisher===author)&&(period==='all'||Date.parse(item.publishedAt)>=now-days[period]*86400000)).map(item=>({title:item.title,href:item.href,author:item.publisher,date:item.publishedAt}));
 return {results,authors,partial:false};
}
