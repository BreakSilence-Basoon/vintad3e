import {createElement,type ReactNode} from 'react';
import type {SafeContent} from './fixture-publication-content';

// Keep the existing meeting-reader vocabulary, while also accepting explicitly labelled speakers.
const knownSpeakers=new Set(['직원','담당자','(상대)']);
const markers=/\[([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\]/gu;
type Element=Exclude<SafeContent,string>;
const textOf=(node:SafeContent):string=>typeof node==='string'?node:node.children.map(textOf).join('');
function speaker(node:SafeContent,next?:SafeContent):string|null {
  if(typeof node==='string'||node.tag!=='strong')return null;
  const text=textOf(node).trim(),name=text.replace(/[:：]$/u,'').trim();
  return knownSpeakers.has(name)||((/[:：]$/u.test(text)||(typeof next==='string'&&/^\s*[:：]/u.test(next)))&&/^[\p{L}\p{N}() ._-]{1,40}$/u.test(name))?text:null;
}
function label(row:Element):string|null {
  const cell=row.children.find(node=>typeof node!=='string'&&(node.tag==='td'||node.tag==='th'));
  if(!cell)return null;const match=/^\s*\[?([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\]?\s*$/u.exec(textOf(cell));return match?.[1]??null;
}
/** Render only parser-approved elements; ambiguous or unmatched notes remain unchanged text. */
export function MeetingCorrectedRenderer({nodes}:{nodes:SafeContent[]}) {
  const rowNotes=new WeakMap<Element,string>(),counts=new Map<string,number>();
  function findRows(items:SafeContent[],inTable=false) {for(const node of items)if(typeof node!=='string') {const table=inTable||node.tag==='table';if(table&&node.tag==='tr'){const note=label(node);if(note){rowNotes.set(node,note);counts.set(note,(counts.get(note)??0)+1);}}findRows(node.children,table);}}
  findRows(nodes);
  const refs=new Map<string,string[]>();let sequence=0;
  function collect(items:SafeContent[],excluded=false) {for(const node of items) {if(typeof node==='string'){if(!excluded)for(const match of node.matchAll(markers))if(counts.get(match[1])===1){const id=`meeting-reference-${++sequence}`;refs.set(match[1],[...(refs.get(match[1])??[]),id]);}}else collect(node.children,excluded||node.tag==='table'||node.tag==='code'||node.tag==='pre');}}
  collect(nodes);let used=0;
  function renderText(value:string,key:string,excluded:boolean):ReactNode {
    if(excluded)return value;value=value.replace(/\[(?:\d{1,2}:){1,2}\d{2}\]/gu,'').replace(/ {2,}/gu,' ');const out:ReactNode[]=[];let start=0;
    for(const match of value.matchAll(markers)) {if(counts.get(match[1])!==1)continue;if(match.index>start)out.push(value.slice(start,match.index));const id=`meeting-reference-${++used}`;out.push(<a key={`${key}-${id}`} id={id} className="library-transcript__note" href={`#meeting-note-${match[1]}`} aria-label={`교정 근거 ${match[1]}`}>{match[0]}</a>);start=match.index+match[0].length;}
    if(!out.length)return value;if(start<value.length)out.push(value.slice(start));return out;
  }
  function render(node:SafeContent,key:string,excluded=false):ReactNode {
    if(typeof node==='string')return renderText(node,key,excluded);
    const blocked=excluded||node.tag==='table'||node.tag==='code'||node.tag==='pre';
    if(node.tag==='p'&&!blocked) {
      const turns:Array<{speaker:string|null;children:SafeContent[]}>=[];
      for(const [index,child] of node.children.entries()){const name=speaker(child,node.children[index+1]);if(name)turns.push({speaker:name,children:[]});else{if(!turns.length)turns.push({speaker:null,children:[]});turns[turns.length-1].children.push(child);}}
      if(turns.some(turn=>turn.speaker))return <div className="library-transcript" key={key}>{turns.map((turn,index)=><p className="library-transcript__turn" key={`${key}-${index}`}>{turn.speaker&&<strong className="library-transcript__speaker">{turn.speaker}</strong>}<span className="library-transcript__speech">{turn.children.map((child,i)=>render(child,`${key}-${index}-${i}`))}</span></p>)}</div>;
    }
    const note=node.tag==='tr'?rowNotes.get(node):undefined,valid=note&&counts.get(note)===1?note:undefined;
    const children=node.children.map((child,index)=>{
      if(valid && index===node.children.length-1 && typeof child!=='string' && (child.tag==='td'||child.tag==='th')) {
        const links=refs.get(valid)??[];return createElement(child.tag,{key:`${key}-${index}`},...child.children.map((part,i)=>render(part,`${key}-${index}-${i}`,true)),links.length?<span className="library-transcript__returns" key="returns">{links.map((id,i)=><a key={id} href={`#${id}`} aria-label={`본문의 교정 표식으로 돌아가기 ${links.length>1?i+1:''}`}>본문으로{links.length>1?` ${i+1}`:''} ↑</a>)}</span>:null);
      }
      return render(child,`${key}-${index}`,blocked);
    });
    if(node.tag==='a')return node.href?<a key={key} href={node.href} rel="noopener noreferrer" {...(node.href.startsWith('https:')?{target:'_blank'}:{})}>{children}</a>:<span key={key}>{children}</span>;
    if(node.tag==='table')return <div className="notion-table-wrap" key={key}><table>{children}</table></div>;
    return createElement(node.tag,{key,...(valid?{id:`meeting-note-${valid}`}:{})},node.tag==='br'||node.tag==='hr'?undefined:children);
  }
  return <article className="publication-content">{nodes.map((node,index)=>render(node,`node-${index}`))}</article>;
}
