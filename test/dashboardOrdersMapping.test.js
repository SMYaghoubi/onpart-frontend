const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('dashboard displays the API active-user count and never fabricates zero on failure',()=>{
  const page=read('admin/index.html');
  assert.match(page,/m\.active_users==null\?'—':fa\(Number\(m\.active_users\)\)/);
  assert.doesNotMatch(page,/stat_users'\)\.textContent=fa\(m\.active_users\|\|0\)/);
  assert.match(page,/id="stat_users">—</);
  assert.match(page,/onpart:user-data-changed',refreshForUserData/);
  assert.match(page,/AdminRefreshCoordinator\.create\(loadDashboard,\{delay:250\}\)/);
});

test('admin orders maps supported response shapes and distinguishes errors from a real empty list',()=>{
  const page=read('admin/orders.html');
  assert.match(page,/if\(!res\.ok\)throw new Error\(data\.message\|\|'خطا در دریافت سفارش‌ها'\)/);
  assert.match(page,/Array\.isArray\(data\)\)orders=data/);
  assert.match(page,/Array\.isArray\(data\.orders\)\)orders=data\.orders/);
  assert.match(page,/ordersLoadError/);
  assert.match(page,/تلاش دوباره/);
  assert.match(page,/نمایش ۰ از ۰ سفارش/);
});

test('admin order list and detail reads explicitly use management context without a default status filter',()=>{
  const page=read('admin/orders.html');
  assert.match(page,/\/api\/orders\?limit=200&admin=1/);
  assert.equal((page.match(/\/api\/orders\/\$\{orderId\}\?admin=1/g)||[]).length,2);
  assert.match(page,/<option value="">همه وضعیت‌ها<\/option>/);
  assert.match(page,/\(!sf\|\|o\.status===sf\)/);
});