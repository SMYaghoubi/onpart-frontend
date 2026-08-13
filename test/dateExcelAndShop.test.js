const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

function dateFormatter(){const source=read('js/api.js'),start=source.indexOf('(function initOnPartDate'),end=source.indexOf('// OnPart API Helper',start),context={window:null,Date,Intl,String,Number};context.window=context;vm.runInNewContext(source.slice(start,end),context);return context.OnPartDate;}
test('shared Persian formatter handles null, invalid, ISO, date-only and time in Tehran',()=>{
  const formatter=dateFormatter();
  assert.equal(formatter.format(null),'—');assert.equal(formatter.format('invalid'),'—');
  for(const value of ['2026-08-13','2026-08-13T10:20:00Z']){const result=formatter.format(value);assert.doesNotMatch(result,/2026|08-13/);assert.match(result,/[۰-۹]/);}
  assert.match(formatter.format('2026-08-13T10:20:00Z',{withTime:true}),/:/);
  assert.equal(formatter.timeZone,'Asia/Tehran');assert.match(formatter.locale,/persian/);
});

test('product Excel contract has one ordered real-schema header set and round-trips binary labels',()=>{
  const context={window:null,Object,String,Number};context.window=context;vm.runInNewContext(read('js/product-excel.js'),context);const excel=context.ProductExcel;
  assert.deepEqual(Array.from(excel.ORDER),['کد محصول / OEM','شرح محصول','خودرو','برند','گروه کالا','قیمت (تومان)','وضعیت موجودی','گردش','تأمین‌کننده']);
  const row=excel.row({code:'001-AbC',description:'قطعه',car:'خودرو',brand:'برند',category:'گروه',price:100,available:true,has_flow:0},'شرکت');
  assert.equal(row['کد محصول / OEM'],'001-AbC');assert.equal(row['وضعیت موجودی'],'موجود');assert.equal(row['گردش'],'ندارد');
  assert.equal(excel.availability(row,2).available,true);assert.equal(excel.flow(row,2),0);
  const legacy=excel.availability({'موجودی':'5'},3);assert.equal(legacy.available,true);assert.equal(legacy.legacy,true);
});

test('shop has no row-selection radio or empty selection column while quantity controls remain',()=>{
  const source=read('shop.html');assert.doesNotMatch(source,/sel-dot|toggleSel|const qtys = \{\}, sel/);assert.match(source,/onclick="chg\(\$\{p\.id\},1\)"/);assert.match(source,/id="productQty_\$\{p\.id\}"/);
});

test('manager page uses real management data and Persian login/logout dates',()=>{
  const source=read('admin/admins.html');assert.match(source,/role=management/);assert.doesNotMatch(source,/sampleAdmins/);assert.match(source,/last_login_at/);assert.match(source,/last_logout_at/);assert.match(source,/API\.formatDate/);
});

test('included UI does not render raw Gregorian date substrings in audited pages',()=>{
  for(const file of ['admin/admins.html','admin/partners.html','admin/payments.html','admin/invoice.html','js/admin.js']){const source=read(file);assert.doesNotMatch(source,/\.(?:slice|substring)\(0,10\)|new Date\([^)]*\)\.toLocale(?:DateString|String)\('fa-IR'/);}
});
