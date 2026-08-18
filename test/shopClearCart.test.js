const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const shop=fs.readFileSync(path.join(__dirname,'..','shop.html'),'utf8');
const components=fs.readFileSync(path.join(__dirname,'..','js','components.js'),'utf8');
const flow=shop.slice(shop.indexOf('let clearCartInFlight=false'),shop.indexOf('let checkoutInFlight = false'));

test('clear button is visible only when distinct cart items exist',()=>{
  assert.match(shop,/clearButton\.hidden=count===0/);
  assert.match(shop,/const count = Object\.values\(qtys\)\.filter\(v=>Number\(v\)>0\)\.length/);
  assert.match(shop,/id="clearCartButton"[\s\S]*?hidden/);
});

test('confirmation is explicit and safe action receives initial focus',()=>{
  assert.match(shop,/همه کالاهای سبد خرید حذف شوند؟ این عملیات قابل بازگشت نیست\./);
  assert.match(shop,/id="clearCartCancel"[\s\S]*?autofocus>انصراف/);
  assert.match(shop,/id="clearCartConfirm"[\s\S]*?>بله، پاک شود/);
  assert.match(flow,/addEventListener\('cancel'[\s\S]*?preventDefault/);
  assert.match(flow,/event\.target===clearCartDialog[\s\S]*?clearCartDialog\.close\(\)/);
  assert.match(shop,/Escape'[\s\S]*?!document\.getElementById\('clearCartDialog'\)\.open/);
});

test('only explicit confirmation calls server once and success clears every local view',()=>{
  assert.match(flow,/if\(clearCartInFlight\) return/);
  assert.match(flow,/clearCartInFlight=true/);
  assert.equal((flow.match(/OnPart\.clearCart\(/g)||[]).length,1);
  assert.match(flow,/if\(cleared\)[\s\S]*Object\.keys\(qtys\).*delete qtys/);
  assert.match(flow,/products\.forEach\(product=>updateProductRow\(product\.id\)\)/);
  assert.match(flow,/updateCartCount\(\);[\s\S]*openCart\(\)/);
});

test('failed clear preserves local quantities and offers retry',()=>{
  const failure=flow.slice(flow.indexOf('}else{'));
  assert.match(failure,/پاک‌کردن سبد انجام نشد؛ دوباره تلاش کنید/);
  assert.match(failure,/confirm\.textContent='تلاش دوباره'/);
  assert.doesNotMatch(failure,/delete qtys/);
});

test('shared clear helper reports server failure instead of clearing optimistically',()=>{
  const helper=components.slice(components.indexOf('clearCart: async function'),components.indexOf('updateCartCount: async function'));
  assert.match(helper,/if\(!token\) return false/);
  assert.match(helper,/if\(!res\.ok\) return false/);
  assert.match(helper,/return true/);
});
