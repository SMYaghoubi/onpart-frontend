const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const shop=fs.readFileSync(path.join(__dirname,'..','shop.html'),'utf8');
const users=fs.readFileSync(path.join(__dirname,'..','admin/users.html'),'utf8');

test('shop retries transient cold-start failures without retrying permanent client errors',()=>{
  assert.match(shop,/async function requestShopData\(path,\{attempts=3\}=\{\}\)/);
  assert.match(shop,/const transient=!error\.status\|\|error\.status===429\|\|error\.status>=500/);
  assert.match(shop,/await waitForProducts\(350\*attempt\)/);
  assert.match(shop,/API\.request\(path,\{cache:'no-store'\}\)/);
});

test('metadata failure is isolated while product failure renders a clear retry state',()=>{
  const load=shop.slice(shop.indexOf('async function loadProducts()'),shop.indexOf('const qtys'));
  assert.match(load,/const data=await requestShopData\('\/api\/products\?limit=999999'\)/);
  assert.match(load,/requestShopData\('\/api\/products\/metadata',[\s\S]*?\.catch\(error=>/);
  assert.match(load,/return \{cars:\[\],brands:\[\],categories:\[\]\}/);
  assert.match(load,/if\(metadataError\) OnPart\.toast/);
  assert.match(load,/role="alert"/);assert.match(load,/onclick="loadProducts\(\)"/);
  assert.ok(load.indexOf('render();')<load.indexOf('const metadata=await metadataPromise'),'products must render before metadata settles');
  assert.match(load,/esc\(message\)/);
});

test('admin user editor exposes all three explicit role values including downgrade to user',()=>{
  for(const role of ['user','partner','admin'])assert.match(users,new RegExp(`<option value="${role}">`));
  assert.match(users,/role:document\.getElementById\('f_role'\)\.value/);
  assert.doesNotMatch(users,/users\s*=\s*\(Array\.isArray\(data\)[^\n]+\.filter\(u=>u\.role!==['"']admin['"']\)/);
  assert.match(users,/managementUser\.role==='admin'\?rows:rows\.filter/);
});

test('self downgrade clears only the management session and leaves shop session intact',()=>{
  assert.match(users,/currentId===Number\(managementUser\.id\)&&data\.role==='user'/);
  assert.match(users,/OnPartSession\.clear\('admin'\)/);
  assert.doesNotMatch(users,/OnPartSession\.clear\('user'\)/);
});
