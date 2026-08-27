const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const users=read('admin/users.html');
const orders=read('admin/orders.html');
const payments=read('admin/payments.html');
const payment=read('payment.html');
const invoice=read('admin/invoice.html');

test('user editor prefers canonical province while preserving legacy state compatibility',()=>{
  assert.match(users,/\.value=u\.province\|\|u\.state\|\|''/);
  assert.match(users,/province:document\.getElementById\('f_state'\)\.value,state:document\.getElementById\('f_state'\)\.value/);
  assert.match(users,/city:document\.getElementById\('f_city'\)\.value/);
  assert.match(users,/address:document\.getElementById\('f_addr'\)\.value/);
});

test('user search starts empty and asks browsers not to restore or autofill it',()=>{
  assert.match(users,/id="searchInp"[^>]*autocomplete="off"/);
  assert.match(users,/function resetUserSearch\(\)[\s\S]*input\.value=''[\s\S]*input\.defaultValue=''/);
  assert.match(users,/addEventListener\('pageshow',[\s\S]*resetUserSearch\(\)/);
});

test('order detail uses a bounded smooth internal item scroller with fixed modal regions',()=>{
  assert.match(orders,/#detailModal \.modal\{[^}]*display:flex;flex-direction:column/);
  assert.match(orders,/#detailItems\{[^}]*max-height:[^;]+;[^}]*overflow-y:auto/);
  assert.match(orders,/-webkit-overflow-scrolling:touch/);
  assert.match(orders,/#detailModal \.modal-head,#detailModal \.modal-foot\{flex:0 0 auto\}/);
});

test('toman display rounds fractional values and invoice price editor accepts whole units',()=>{
  for(const source of [orders,payments,invoice])assert.match(source,/Math\.round\(Number\([^)]*\)\|\|0\)/);
  assert.match(orders,/id="\$\{prefix\}price_\$\{j\}"[^>]*step="1"/);
  assert.match(orders,/invprice_\$\{j\}`\)\.value=Math\.round/);
});

test('receipt description is submitted and shown distinctly in management payment details',()=>{
  assert.match(payment,/id="paymentDescription"[^>]*name="description"/);
  assert.match(payment,/fd\.append\('description',description\)/);
  assert.match(payments,/توضیحات کاربر:/);
  assert.match(payments,/Admin\.escape\(p\.description\)/);
});
