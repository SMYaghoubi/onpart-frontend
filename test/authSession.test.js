const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

function storage(){const values=new Map();return {getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)}}
function jwt(role,exp=Math.floor(Date.now()/1000)+3600){
  const b=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  return b({alg:'none'})+'.'+b({role,exp})+'.x';
}
function manager(pathname='/'){
  const source=fs.readFileSync(require.resolve('../js/api.js'),'utf8');
  const start=source.indexOf('(function initOnPartSession');
  const end=source.indexOf('// OnPart API Helper',start);
  const listeners={};const sessionStorage=storage(),localStorage=storage();
  const context={window:null,location:{pathname},sessionStorage,localStorage,Date,JSON,Math,String,Array,decodeURIComponent,atob:v=>Buffer.from(v,'base64').toString('binary'),addEventListener:(name,fn)=>listeners[name]=fn};
  context.window=context;vm.runInNewContext(source.slice(start,end),context);
  return {...context,listeners};
}
test('three role sessions coexist and context follows clean routes',()=>{
  const env=manager('/admin/orders');
  env.OnPartSession.setSession('admin',jwt('admin'),{role:'admin'});
  env.OnPartSession.setSession('user',jwt('user'),{role:'user'});
  env.OnPartSession.setSession('supplier',jwt('supplier'),{role:'supplier'});
  assert.equal(env.OnPartSession.contextFor(),'admin');
  assert.equal(env.OnPartSession.contextFor('/api/supplier-portal/admin/updates'),'admin');
  assert.equal(env.OnPartSession.contextFor('/api/supplier-portal/products'),'admin');
  assert.equal(env.OnPartSession.getToken(env.OnPartSession.contextFor('/api/supplier-portal/admin/updates')),env.OnPartSession.getToken('admin'));
  assert.ok(env.OnPartSession.getToken('admin'));assert.ok(env.OnPartSession.getToken('user'));assert.ok(env.OnPartSession.getToken('supplier'));
});
test('logout and invalid tokens are isolated by role',()=>{
  const env=manager('/shop');
  env.OnPartSession.setSession('admin',jwt('partner'),{role:'partner'});
  env.OnPartSession.setSession('user',jwt('user'),{role:'user'});
  env.OnPartSession.clear('user');
  assert.equal(env.OnPartSession.getToken('user'),null);assert.ok(env.OnPartSession.getToken('admin'));
  assert.throws(()=>env.OnPartSession.setSession('admin',jwt('user'),{role:'user'}));
  assert.throws(()=>env.OnPartSession.setSession('user',jwt('user',1),{role:'user'}));
});
test('legacy key migrates only to matching namespace',()=>{
  const source=fs.readFileSync(require.resolve('../js/api.js'),'utf8');
  const start=source.indexOf('(function initOnPartSession'),end=source.indexOf('// OnPart API Helper',start);
  const sessionStorage=storage(),localStorage=storage(),token=jwt('admin');
  sessionStorage.setItem('op_token',token);sessionStorage.setItem('op_user',JSON.stringify({role:'admin'}));
  const context={window:null,location:{pathname:'/admin/'},sessionStorage,localStorage,Date,JSON,Math,String,Array,decodeURIComponent,atob:v=>Buffer.from(v,'base64').toString('binary'),addEventListener(){}};
  context.window=context;vm.runInNewContext(source.slice(start,end),context);
  assert.equal(sessionStorage.getItem('op_token'),null);assert.equal(context.OnPartSession.getToken('admin'),token);assert.equal(context.OnPartSession.getToken('user'),null);
});
test('supplier portal page keeps its supplier context',()=>{
  const env=manager('/supplier/');
  env.OnPartSession.setSession('supplier',jwt('supplier'),{role:'supplier'});
  assert.equal(env.OnPartSession.contextFor('/api/supplier-portal/products'),'supplier');
  assert.equal(env.OnPartSession.contextFor('/api/supplier-portal/admin/updates'),'admin');
});