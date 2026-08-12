const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('admin product UI and export use availability without numeric stock controls',()=>{
  const source=read('admin/products.html');
  assert.match(source,/id="f_available"/);assert.match(source,/id="be_enable_available"/);
  assert.doesNotMatch(source,/id="f_stock"|id="f_minstock"|id="be_stock"/);
  assert.match(source,/وضعیت موجودی/);assert.match(source,/فایل قدیمی/);
  assert.doesNotMatch(source,/fields\.stock\s*=/);
});
test('supplier manual, Excel and review flows expose only binary availability',()=>{
  const portal=read('supplier/index.html'),review=read('admin/supplier-updates.html');
  assert.match(portal,/available:c\.available/);assert.match(portal,/وضعیت موجودی/);
  assert.doesNotMatch(portal,/id="bulkStock"|applyBulkStock|c\.stock|row\.stock/);
  assert.match(review,/proposed_available/);assert.match(review,/available:item\.proposed_available/);
  assert.doesNotMatch(review,/type="number"[^>]*placeholder="بدون تغییر"/);
});
test('shop remains binary for display while retaining internal quantity caps',()=>{
  const source=read('shop.html');
  assert.match(source,/p\.stock\?'<span class="chip ch-green">موجود/);
  assert.match(source,/stockQty:\s*Number\(p\.stock\)/);
  assert.match(source,/quantity > product\.stockQty/);
});
test('single product create/edit uses a required binary field and sends no quantity',()=>{
  const source=read('admin/products.html');
  assert.match(source,/id="f_available" required aria-required="true"/);
  assert.match(source,/p\.available===true\)\?'true':'false'/);
  assert.match(source,/document\.getElementById\('f_available'\)\.value='false'/);
  assert.match(source,/available:\s*availabilityValue==='true'/);
  assert.doesNotMatch(source,/\bstock\s*:\s*Number\(document\.getElementById\('f_/);
  assert.match(source,/closeModal\(\); await loadProducts\(\)/);
});
test('single product removal explains archive behavior and refreshes the active list',()=>{
  const source=read('admin/products.html');
  assert.match(source,/اگر سابقه سفارش یا تأمین‌کننده داشته باشد، برای حفظ سوابق مالی آرشیو خواهد شد/);
  assert.match(source,/API\.request\(`\/api\/products\/\$\{currentId\}`/);
  assert.match(source,/method:'DELETE',authContext:'admin'/);
  assert.match(source,/selectedIds\.delete\(Number\(currentId\)\)/);
  assert.match(source,/closeModal\(\);\s*await loadProducts\(\)/);
  assert.doesNotMatch(source,/throw new Error\(\(await res\.json\(\)\)\.message \|\| 'خطا'\)/);
});
test('bulk product removal uses the safe endpoint and shows partial result details',()=>{
  const source=read('admin/products.html');
  assert.match(source,/API\.request\('\/api\/products\/bulk-delete'/);
  assert.match(source,/method:'POST',authContext:'admin'/);
  assert.match(source,/result\.deleted\|\|0/);assert.match(source,/result\.archived\|\|0/);assert.match(source,/result\.failed/);
  assert.match(source,/selectedIds\.clear\(\);\s*await loadProducts\(\)/);
  assert.doesNotMatch(source,/fetch\(`\$\{API\.BASE_URL\}\/api\/products\/bulk-delete/);
});