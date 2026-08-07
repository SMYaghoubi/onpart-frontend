const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

function apiContext(pathname,userAgent){
  let source=fs.readFileSync(require.resolve('../js/api.js'),'utf8');
  source=source.slice(source.indexOf('const API =')).replace('const API =','globalThis.API =').replace(/API\.installFetchTimeout\(\);\s*$/,'');
  const calls=[],payload={products:[{id:9,code:'NEW'}],total:1};
  const context={
    window:{location:{origin:'https://onpart.ir'}},location:{pathname},navigator:{userAgent},
    OnPartSession:{contextFor:()=>pathname.startsWith('/admin/')?'admin':'user',getToken:()=>null},
    fetch:async(url,options)=>{calls.push({url,options});return {ok:true,headers:{get:()=> 'application/json'},json:async()=>payload,text:async()=>JSON.stringify(payload)}},
    AbortController,FormData:class FormData{},URL,URLSearchParams,setTimeout,clearTimeout,console
  };
  vm.createContext(context);vm.runInContext(source,context);
  return {context,calls,payload};
}

test('same dynamic response is returned on desktop and mobile without cache reuse',async()=>{
  const desktop=apiContext('/admin/products','Desktop Chrome'),mobile=apiContext('/admin/products','Android Chrome');
  const a=await vm.runInContext("API.request('/api/products?limit=99999&admin=1')",desktop.context);
  const b=await vm.runInContext("API.request('/api/products?limit=99999&admin=1')",mobile.context);
  assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
  assert.equal(desktop.calls[0].options.cache,'no-store');
  assert.equal(mobile.calls[0].options.cache,'no-store');
});

test('production API origin is fixed and has no storage override or service worker',()=>{
  const api=fs.readFileSync(require.resolve('../js/api.js'),'utf8');
  assert.match(api,/BASE_URL:\s*'https:\/\/onpartpadmin\.liara\.run'/);
  assert.doesNotMatch(api,/localStorage[^\n]*(?:API|BASE_URL)|(?:API|BASE_URL)[^\n]*localStorage/i);
  const files=['../index.html','../admin/products.html','../js/api.js','../js/admin.js'];
  assert.equal(files.some(file=>/serviceWorker\.register/.test(fs.readFileSync(require.resolve(file),'utf8'))),false);
});

test('products page never substitutes the four legacy sample products after a failed request',()=>{
  const page=fs.readFileSync(require.resolve('../admin/products.html'),'utf8');
  assert.doesNotMatch(page,/10403004435|04000500399|16200100754|18610503799/);
  assert.match(page,/دریافت محصولات انجام نشد/);
  assert.match(page,/onpart:user-data-changed/);
});