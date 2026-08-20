const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const data=require('../js/admin-payment-data');

const page=fs.readFileSync(path.join(__dirname,'..','admin','payments.html'),'utf8');
const admin=fs.readFileSync(path.join(__dirname,'..','js','admin.js'),'utf8');
const fixture=[
  {id:'26',order_id:null,amount:'751170',status:'submitted',user_name:'رضا نادری پور',bank:null,reviewed_at:null,created_at:'2026-08-20T10:00:00Z'},
  {id:'27',order_id:'42',amount:'100000',status:'approved',user_name:'کاربر دوم',bank:'ملت',reviewed_at:'2026-08-18T10:00:00Z'},
  {id:'28',order_id:null,amount:'50000',status:'rejected',user_name:'کاربر سوم',bank:null,created_at:'2026-07-01T10:00:00Z'}
];

test('admin payment response accepts array and object shapes with numeric strings',()=>{
  const array=data.parseResponse(fixture);
  const object=data.parseResponse({payments:fixture,total:3});
  assert.deepEqual(array,object);
  assert.equal(array[0].status,'pending');
  assert.equal(array[0].amount,751170);
  assert.equal(array[0].order_id,null);
  assert.throws(()=>data.parseResponse({rows:fixture}),/معتبر نیست/);
});

test('all and pending filters retain linked and unlinked submitted receipts',()=>{
  const rows=data.parseResponse(fixture);
  assert.equal(data.filter(rows,{status:''}).length,3);
  const pending=data.filter(rows,{status:'pending'});
  assert.equal(pending.length,1);
  assert.equal(pending[0].id,26);
  assert.equal(pending[0].order_id,null);
});

test('payment totals are independent of page slicing and month approval is exact',()=>{
  const rows=data.parseResponse(fixture);
  const totals=data.summarize(rows,new Date('2026-08-20T12:00:00Z'));
  assert.deepEqual(totals,{pendingCount:1,approvedMonthSum:100000,rejectedCount:1,totalSum:901170});
});

test('management page uses explicit auth context and distinguishes API errors from empty data',()=>{
  assert.match(page,/api\/payments\?admin=1/);
  assert.match(page,/AdminPaymentData\.parseResponse\(payload\)/);
  assert.match(page,/if\(!res\.ok\)throw new Error/);
  assert.match(page,/paymentsLoadError/);
  assert.match(page,/تلاش دوباره/);
  assert.match(page,/href="\/admin\/login"/);
  assert.match(page,/curTab='all'/);
  assert.match(page,/if\(!rows\.length\)return '[^']*—<\/span>'/);
  assert.match(admin,/api\/payments\?admin=1/);
  assert.match(admin,/Array\.isArray\(d\.payments\)/);
});

test('receipt endpoint and existing approve reject actions remain unchanged',()=>{
  assert.match(page,/api\/payments\/\$\{Number\(id\)\}\/receipt/);
  assert.match(page,/api\/payments\/\$\{currentId\}\/approve/);
  assert.match(page,/api\/payments\/\$\{currentId\}\/reject/);
});