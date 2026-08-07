const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'..','shop.html'),'utf8');

test('checkout starts suppression before the API call and completes audio after real success',()=>{
  const begin=source.indexOf('OnPartCheckoutSuccess.begin(OnPart)');
  const request=source.indexOf("API.request('/api/orders'",begin);
  const valid=source.indexOf('if(!data || !data.id)',request);
  const complete=source.indexOf('await OnPartCheckoutSuccess.complete',valid);
  assert.ok(begin>0&&request>begin&&valid>request&&complete>valid);
  assert.match(source,/let checkoutInFlight = false/);
  assert.match(source,/if\(checkoutInFlight\) return/);
});

test('order failure cancels suppression and has no success redirect path in catch',()=>{
  const catchStart=source.indexOf('checkoutInFlight = false;',source.indexOf('async function checkout'));
  const catchEnd=source.indexOf('} finally {',catchStart);
  const catchBody=source.slice(catchStart,catchEnd);
  assert.match(catchBody,/OnPartCheckoutSuccess\.cancel\(OnPart\)/);
  assert.doesNotMatch(catchBody,/window\.location/);
  assert.doesNotMatch(catchBody,/playUserNotificationSound/);
});
