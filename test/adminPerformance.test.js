const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {create}=require('../js/admin-refresh');

const waitTick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((ok,no)=>{resolve=ok;reject=no;});return {promise,resolve,reject};}
function fakeTimers(){let id=0;const jobs=new Map();return {setTimer(fn){const key=++id;jobs.set(key,fn);return key;},clearTimer(key){jobs.delete(key);},flush(){const current=[...jobs.values()];jobs.clear();current.forEach(fn=>fn());},size(){return jobs.size;}};}

test('dashboard coordinator merges bursts and allows at most one trailing refresh',async()=>{
  const timers=fakeTimers();const first=deferred();let calls=0;
  const coordinator=create(()=>{calls++;return calls===1?first.promise:Promise.resolve();},{delay:250,setTimer:timers.setTimer,clearTimer:timers.clearTimer});
  coordinator.request('initial',{immediate:true});
  await waitTick();
  assert.equal(calls,1);
  coordinator.request('notification');coordinator.request('user-data');coordinator.request('visibility');
  assert.equal(calls,1);assert.equal(timers.size(),0);
  first.resolve();await waitTick();await waitTick();
  assert.equal(timers.size(),1);
  timers.flush();await waitTick();await waitTick();
  assert.equal(calls,2);
  assert.equal(timers.size(),0);
  coordinator.destroy();
});

test('dashboard coordinator debounces simultaneous idle events into one request',async()=>{
  const timers=fakeTimers();let calls=0;
  const coordinator=create(async()=>{calls++;},{delay:250,setTimer:timers.setTimer,clearTimer:timers.clearTimer});
  coordinator.request('notification');coordinator.request('user-data');coordinator.request('interval');
  assert.equal(timers.size(),1);timers.flush();await waitTick();assert.equal(calls,1);
});

function classList(initial=[]){const values=new Set(initial);return {add:v=>values.add(v),remove:v=>values.delete(v),contains:v=>values.has(v),toggle(v,on){if(on===undefined){if(values.has(v))values.delete(v);else values.add(v);}else if(on)values.add(v);else values.delete(v);},values};}
function loadAdmin({playImpl=()=>Promise.resolve()}={}){
  const listeners=new Map();
  const on=(type,fn)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);};
  const off=(type,fn)=>listeners.set(type,(listeners.get(type)||[]).filter(item=>item!==fn));
  const body={classList:classList(),appendChild(){},innerHTML:''};
  const root={classList:classList()};
  const document={hidden:false,body,documentElement:root,activeElement:null,head:{appendChild(){}},
    createElement:()=>({className:'',id:'',style:{},setAttribute(){},textContent:''}),
    addEventListener:on,removeEventListener:off,querySelectorAll:()=>[],querySelector:()=>null,getElementById:()=>null};
  class FakeAudio{constructor(){this.muted=false;this.currentTime=0;this.playCount=0;}play(){this.playCount++;return playImpl(this);}pause(){}}
  const context={console,document,window:{EventSource:null,matchMedia:()=>({matches:true}),location:{href:'https://onpart.ir/admin/',origin:'https://onpart.ir'},addEventListener(){},dispatchEvent(){}},Audio:FakeAudio,MutationObserver:class{observe(){}},OnPartSession:{getUserRaw:()=>'{"role":"admin"}'},API:{},URL,CustomEvent:class{},sessionStorage:{getItem:()=>null,setItem(){}},setTimeout,clearTimeout,setInterval:()=>1,clearInterval,queueMicrotask,requestAnimationFrame:fn=>{context.raf=fn;},globalThis:null};
  context.globalThis=context;vm.createContext(context);
  const source=fs.readFileSync(path.join(__dirname,'..','js/admin.js'),'utf8');
  vm.runInContext(source+';globalThis.AdminForTest=Admin;',context);
  return {Admin:context.AdminForTest,document,listeners,context};
}

test('admin audio unlock plays once per gesture, removes listeners on success and retries after failure',async()=>{
  const pending=deferred();const env=loadAdmin({playImpl:()=>pending.promise});
  env.Admin.initAdminNotifications();
  assert.equal((env.listeners.get('pointerdown')||[]).length,1);
  assert.equal((env.listeners.get('keydown')||[]).length,1);
  assert.equal((env.listeners.get('touchstart')||[]).length,0);
  assert.equal((env.listeners.get('click')||[]).length,0);
  const unlock=env.listeners.get('pointerdown')[0];
  const menuControl={closest:()=>menuControl};
  unlock({target:menuControl});await waitTick();
  assert.equal(env.Admin._adminNotificationAudio.playCount,0);
  unlock({target:null});unlock({target:null});await waitTick();
  assert.equal(env.Admin._adminNotificationAudio.playCount,1);
  pending.resolve();await waitTick();
  assert.equal((env.listeners.get('pointerdown')||[]).length,0);
  assert.equal((env.listeners.get('keydown')||[]).length,0);

  const failed=loadAdmin({playImpl:()=>Promise.reject(new Error('blocked'))});
  failed.Admin.initAdminNotifications();
  failed.listeners.get('pointerdown')[0]({target:null});await waitTick();
  failed.listeners.get('pointerdown')[0]({target:null});await waitTick();
  assert.equal(failed.Admin._adminNotificationAudio.playCount,2);
});

test('sidebar close is synchronous, listeners bind once and aria/scroll lock stay consistent',()=>{
  const env=loadAdmin();
  const sidebar={classList:classList(['open']),attrs:{},setAttribute(k,v){this.attrs[k]=v;},querySelector:()=>({focus(){}}),querySelectorAll:()=>[]};
  const overlay={id:'sidebarOverlay',classList:classList(['show']),attrs:{},setAttribute(k,v){this.attrs[k]=v;}};
  const button={attrs:{},setAttribute(k,v){this.attrs[k]=v;},focus(){this.focused=true;}};
  env.document.querySelector=selector=>selector==='.sidebar'||selector==='.sidebar.open'?sidebar:null;
  env.document.getElementById=id=>id==='sidebarOverlay'?overlay:id==='adminMenuButton'?button:null;
  env.document.body.classList.add('admin-menu-open');env.document.documentElement.classList.add('admin-menu-open');
  env.Admin.bindSidebarInteractions();env.Admin.bindSidebarInteractions();
  assert.equal((env.listeners.get('pointerup')||[]).length,1);
  assert.equal((env.listeners.get('click')||[]).length,1);
  assert.equal((env.listeners.get('keydown')||[]).length,1);
  const started=performance.now();env.Admin.closeSidebar();const elapsed=performance.now()-started;
  assert.equal(sidebar.classList.contains('open'),false);assert.equal(overlay.classList.contains('show'),false);
  assert.equal(env.document.body.classList.contains('admin-menu-open'),false);assert.equal(env.document.documentElement.classList.contains('admin-menu-open'),false);
  assert.equal(sidebar.attrs['aria-hidden'],'true');assert.equal(overlay.attrs['aria-hidden'],'true');assert.equal(button.attrs['aria-expanded'],'false');
  assert.ok(elapsed<16,`class removal took ${elapsed}ms`);
  const source=fs.readFileSync(path.join(__dirname,'..','js/admin.js'),'utf8');
  assert.match(source,/transition:transform \.22s/);
  assert.match(source,/contain:layout paint/);
  assert.doesNotMatch(source,/translateX\(100%\)/);
  assert.doesNotMatch(source,/backdrop-filter/);
});

test('menu pointer chain closes before audio work and flushes deferred polling once',async()=>{
  const env=loadAdmin();env.Admin.initAdminNotifications();env.Admin.bindSidebarInteractions();
  const sidebar={classList:classList(['open']),attrs:{},setAttribute(k,v){this.attrs[k]=v;},querySelector:()=>({focus(){}}),querySelectorAll:()=>[]};
  const overlay={id:'sidebarOverlay',classList:classList(['show']),attrs:{},setAttribute(k,v){this.attrs[k]=v;}};
  const button={attrs:{},setAttribute(k,v){this.attrs[k]=v;},focus(){},matches:selector=>selector.includes('toggle')};
  button.closest=()=>button;
  env.document.querySelector=selector=>{
    if(selector==='.sidebar')return sidebar;
    if(selector==='.sidebar.open')return sidebar.classList.contains('open')?sidebar:null;
    return null;
  };
  env.document.getElementById=id=>id==='sidebarOverlay'?overlay:id==='adminMenuButton'?button:null;
  env.document.body.classList.add('admin-menu-open');env.document.documentElement.classList.add('admin-menu-open');
  env.Admin._badgeRefreshDeferred=true;env.Admin._notifRefreshDeferred=true;env.Admin._notifTrailingNotify=true;
  let badgeCalls=0,notifCalls=0;
  env.Admin.loadBadges=()=>{badgeCalls++;return Promise.resolve();};
  env.Admin.loadNotifs=notify=>{notifCalls+=notify?1:100;return Promise.resolve();};
  env.listeners.get('pointerdown')[0]({target:button});
  env.listeners.get('pointerup')[0]({target:button});
  assert.equal(sidebar.classList.contains('open'),false);
  assert.equal(overlay.classList.contains('show'),false);
  assert.equal(env.document.body.classList.contains('admin-menu-open'),false);
  assert.equal(env.document.documentElement.classList.contains('admin-menu-open'),false);
  assert.equal(env.Admin._adminNotificationAudio.playCount,0);
  env.listeners.get('click')[0]({target:button});
  assert.equal(sidebar.classList.contains('open'),false);
  overlay.closest=()=>overlay;
  sidebar.classList.add('open');overlay.classList.add('show');
  env.listeners.get('pointerup')[0]({target:overlay});
  assert.equal(sidebar.classList.contains('open'),false);
  sidebar.classList.add('open');overlay.classList.add('show');
  env.listeners.get('keydown')[1]({key:'Escape'});
  assert.equal(sidebar.classList.contains('open'),false);
  await waitTick();
  assert.equal(badgeCalls,1);
  assert.equal(notifCalls,1);
});

test('shared polling skips hidden pages and reuses overlapping requests',async()=>{
  const env=loadAdmin();let badgeCalls=0;const badge=deferred();env.Admin._loadBadgesNow=()=>{badgeCalls++;return badge.promise;};
  const first=env.Admin.loadBadges(),second=env.Admin.loadBadges();assert.equal(first,second);assert.equal(badgeCalls,1);
  badge.resolve();await first;env.document.hidden=true;await env.Admin.loadBadges();assert.equal(badgeCalls,1);

  env.document.hidden=false;let notifCalls=0;const notif=deferred();env.Admin._loadNotifsNow=()=>{notifCalls++;return notif.promise;};
  env.Admin.loadNotifs(false);env.Admin.loadNotifs(true);env.Admin.loadNotifs(true);assert.equal(notifCalls,1);
  notif.resolve();await waitTick();await waitTick();assert.equal(notifCalls,2);
});

test('dashboard background refresh preserves rendered DOM and lifecycle listeners are named and cleaned',()=>{
  const page=fs.readFileSync(path.join(__dirname,'..','admin/index.html'),'utf8');
  assert.match(page,/if\(reason==='initial'&&!dashboardHasData\)/);
  assert.doesNotMatch(page,/async function loadDashboard\([^)]*\)\{\s*const loading=/);
  assert.match(page,/AdminRefreshCoordinator\.create\(loadDashboard,\{delay:250\}\)/);
  assert.match(page,/if\(Admin\.isSidebarOpen\(\)\)/);
  assert.match(page,/onpart:admin-sidebar-closed/);
  assert.match(page,/if\(!dashboardHasData\)\{/);
  assert.match(page,/removeEventListener\('onpart:admin-notification',refreshForAdminNotification\)/);
  assert.match(page,/clearInterval\(dashboardInterval\)/);
});