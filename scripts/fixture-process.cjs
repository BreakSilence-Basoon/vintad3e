// Private synthetic helper: same module acts as trusted IPC readiness preload in owned children.
if (module.parent && process.env.VINTAGE_FIXTURE_CHILD === '1') {
  const net=require('node:net'),original=net.Server.prototype.emit;
  net.Server.prototype.emit=function(event,...args){
    const result=original.call(this,event,...args);
    if(event==='listening' && typeof process.send==='function'){
      const address=this.address();
      if(address && typeof address==='object') process.send({type:'fixture-listening',pid:process.pid,address:address.address,port:address.port,nonce:process.env.VINTAGE_FIXTURE_NONCE});
    }
    return result;
  };
} else {
 const {spawn}=require('node:child_process'),{randomBytes}=require('node:crypto');
 function hasExited(child){return child.exitCode!==null||child.signalCode!==null}
 function waitExit(child,ms){return new Promise(resolve=>{if(hasExited(child))return resolve(true);let settled=false;const done=()=>{if(settled)return;settled=true;clearTimeout(timer);child.off('exit',onExit);resolve(hasExited(child))};const onExit=()=>done();child.once('exit',onExit);const timer=setTimeout(done,ms)})}
 async function stopChild(child,{graceMs=1500,forceMs=1500}={}){
  if(hasExited(child))return true;
  try{child.kill('SIGTERM')}catch{}
  if(await waitExit(child,graceMs))return true;
  if(hasExited(child))return true;
  try{child.kill('SIGKILL')}catch{}
  return await waitExit(child,forceMs);
 }
 function startChild(entry,{cwd,env,port,timeoutMs=8000}){
  const nonce=randomBytes(16).toString('hex');
  const child=spawn(process.execPath,['--require',__filename,entry],{cwd,env:{...env,VINTAGE_FIXTURE_CHILD:'1',VINTAGE_FIXTURE_NONCE:nonce},stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});
  const ready=new Promise((resolve,reject)=>{let settled=false;const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);child.off('message',onMessage);child.off('exit',onExit);child.off('error',onError);error?reject(error):resolve(child)};const onExit=()=>finish(Error('OWNED_CHILD_EXITED'));const onError=()=>finish(Error('OWNED_CHILD_ERROR'));const onMessage=(m)=>{if(!m||m.type!=='fixture-listening'||m.pid!==child.pid||m.nonce!==nonce||m.address!=='127.0.0.1'||m.port!==port||hasExited(child))return;setTimeout(()=>hasExited(child)?finish(Error('OWNED_CHILD_EXITED')):finish(),100)};child.on('message',onMessage);child.once('exit',onExit);child.once('error',onError);const timer=setTimeout(()=>finish(Error('OWNED_CHILD_TIMEOUT')),timeoutMs)});
  return {child,ready};
 }
 module.exports={startChild,stopChild,hasExited};
}
