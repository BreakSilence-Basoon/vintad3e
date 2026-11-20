import type { FixtureDocument } from './library-fixture';
const key = 'vintad3e-library-fixture-published-01';
export const publishedDocument:FixtureDocument = {id:'00000000-0000-4000-8000-000000000004',title:'업무 안내',publisher:'직원',createdAt:'2026-11-19T03:00:00.000Z',body:'업무를 시작하기 전에 필요한 사항을 확인합니다.'};
export const publishedSnapshot = () => {try{return sessionStorage.getItem(key)==='published';}catch{return false;}};
export const publishedServerSnapshot = () => null;
export const subscribePublished = (callback:()=>void) => {window.addEventListener('vintad3e-library-publication',callback);return ()=>window.removeEventListener('vintad3e-library-publication',callback);};
export function archivePublished() {try{if(sessionStorage.getItem(key)!=='published')return false;sessionStorage.setItem(key,'archived');window.dispatchEvent(new Event('vintad3e-library-publication'));return true;}catch{return false;}}
