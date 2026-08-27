const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const adminPayments=read('admin/payments.html');
const customerPayment=read('payment.html');

test('management manual receipt form uses owned options and a pending multipart endpoint',()=>{
  assert.match(adminPayments,/ثبت دستی فیش واریزی/);
  assert.match(adminPayments,/API\.request\('\/api\/payments\/manual-options\?user_id='/);
  assert.match(adminPayments,/API\.BASE_URL\+'\/api\/payments\/manual'/);
  assert.match(adminPayments,/fd\.append\('user_id',userId\)/);
  assert.match(adminPayments,/fd\.append\('order_id',orderId\)/);
  assert.match(adminPayments,/fd\.append\('saved_card_id',source\.slice\(5\)\)/);
  assert.match(adminPayments,/fd\.append\('source_last4'/);
  assert.match(adminPayments,/fd\.append\('dest_account',destination\)/);
  assert.match(adminPayments,/jalaliDateToIso/);
  assert.match(adminPayments,/در انتظار تأیید/);
});

test('customer receipt history resolves protected blobs through the shared API base',()=>{
  const loader=customerPayment.match(/async function loadHistoryReceipt\(target\)\{[\s\S]*?\n    \}/)?.[0]||'';
  assert.match(loader,/API\.BASE_URL/);
  assert.doesNotMatch(loader,/\bAPI_BASE\b/);
  assert.match(loader,/OnPartSession\.getToken\('user'\)/);
  assert.match(loader,/URL\.createObjectURL/);
  assert.match(loader,/تلاش دوباره/);
});

test('visible related identifiers no longer carry a hash prefix',()=>{
  const files=[
    'admin/index.html','admin/invoice.html','admin/invoices.html','admin/orders.html',
    'admin/payments.html','admin/shipping.html','admin/supplier-updates.html',
    'orders.html','payment.html','supplier/index.html'
  ];
  for(const file of files){
    const source=read(file);
    assert.doesNotMatch(source,/(?:سفارش|فاکتور|پرداخت|بچ|درخواست)\s*#(?:\$\{|\{\{|\d)/,file);
    assert.doesNotMatch(source,/>#\$\{(?:p|o|inv|order|payment|batch)\./,file);
  }
});
