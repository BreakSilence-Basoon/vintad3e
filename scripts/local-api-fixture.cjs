// Local synthetic Ledger/Timetable experiment. Never use real data or credentials.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {generateKeyPairSync}=require('node:crypto'),{spawnSync}=require('node:child_process');
const {startChild,stopChild,hasExited}=require('./fixture-process.cjs');
const {probe}=require('./fixture-http.cjs');
const repo=process.cwd(),args=process.argv.slice(2),check=args.length===1&&args[0]==='--check';
if(args.length && !check){console.error('Usage: node scripts/local-api-fixture.cjs [--check]');process.exit(1)}
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'vintad3e-api-fixture-'));
const clean={PATH:process.env.PATH||'',HOME:process.env.HOME||fixture,TEMP:process.env.TEMP||fixture,TMP:process.env.TMP||fixture,SystemRoot:process.env.SystemRoot||'',NODE_NO_WARNINGS:'1'};
const issuer='https://issuer.example.test',business='example-shop',scope='fixture:read',write='fixture:write';
const ledger={...clean,VINTAD3E_LEDGER_DATABASE_FILE:path.join(fixture,'ledger.sqlite'),VINTAD3E_LEDGER_JWKS_FILE:path.join(fixture,'public-jwks.json'),VINTAD3E_LEDGER_PORT:'43131',VINTAD3E_LEDGER_ISSUER:issuer,VINTAD3E_LEDGER_AUDIENCE:'fixture-audience',VINTAD3E_LEDGER_CLIENT_ID:'fixture-client',VINTAD3E_LEDGER_BUSINESS_ID:business,VINTAD3E_LEDGER_READ_SCOPE:scope,VINTAD3E_LEDGER_WRITE_SCOPE:write};
const timetable={...clean,VINTAD3E_DATABASE_FILE:path.join(fixture,'timetable.sqlite'),VINTAD3E_JWKS_FILE:path.join(fixture,'public-jwks.json'),VINTAD3E_PORT:'43132',VINTAD3E_ISSUER:issuer,VINTAD3E_AUDIENCE:'fixture-audience',VINTAD3E_CLIENT_ID:'fixture-client',VINTAD3E_REQUIRED_SCOPE:scope};
const children=[];
async function stop(){const results=await Promise.all(children.map(child=>stopChild(child)));return results.every(Boolean)}
function init(entry,env,data){const p=spawnSync(process.execPath,[entry],{cwd:repo,env,input:JSON.stringify(data),encoding:'utf8',timeout:30000,windowsHide:true});if(p.status!==0)throw Error('Fixture database initialization failed')}
async function start(label,entry,env,port){const {child,ready}=startChild(entry,{cwd:repo,env,port});children.push(child);try{await ready}catch{throw Error(label+' 서버를 시작하지 못했습니다. 포트와 설치 상태를 확인하세요.')}console.log(label+' 서버가 로컬에서 시작됐습니다.');return child}
process.once('SIGINT',()=>{void stop().then(ok=>process.exit(ok?0:1))});process.once('SIGTERM',()=>{void stop().then(ok=>process.exit(ok?0:1))});
(async()=>{console.log('가상 자료 폴더: '+fixture);const {publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});const jwk=publicKey.export({format:'jwk'});Object.assign(jwk,{kid:'fixture',alg:'RS256',use:'sig'});fs.writeFileSync(path.join(fixture,'public-jwks.json'),JSON.stringify({keys:[jwk]}),{mode:0o600,flag:'wx'});
init('apps/ledger-api/src/init-db.mjs',ledger,{businessId:business,grant:{issuer,subject:'example-user',actorId:'example-actor',active:true,read:true,write:true,tokenValidAfter:0,operatorId:'example-operator',reason:'Example setup'}});
init('apps/timetable-api/src/init-db.mjs',timetable,{issuer,subject:'example-user',businessId:business,staffId:'example-staff'});
const first=await start('Ledger','apps/ledger-api/src/main.mjs',ledger,43131);const second=await start('Timetable','apps/timetable-api/src/main.mjs',timetable,43132);
const a=await probe(43131),b=await probe(43132);if(hasExited(first)||hasExited(second)||a!==400||b!==404)throw Error('로컬 확인 요청의 응답이 예상과 다릅니다.');console.log('인증 없는 확인 요청: Ledger 400, Timetable 404');
if(check){if(!await stop())throw Error('서버 종료를 확인하지 못했습니다.');console.log('가상 기동 확인을 마쳤습니다.');return}console.log('종료하려면 Ctrl+C를 누르세요.');
})().catch(async e=>{const stopped=await stop();if(!stopped)console.error('서버 종료를 확인하지 못했습니다.');console.error(e.message);console.error('가상 자료 폴더는 보존됐습니다: '+fixture);process.exitCode=1});
