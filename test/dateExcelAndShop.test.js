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

test('payment dates round-trip through the same calendar, including Nowruz and leap Esfand',()=>{
  const date=dateFormatter();
  for(const [iso,jalali] of [
    ['2026-09-27','۱۴۰۵/۰۷/۰۵'],
    ['2026-03-21','۱۴۰۵/۰۱/۰۱'],
    ['2025-03-20','۱۴۰۳/۱۲/۳۰'],
    ['2025-03-21','۱۴۰۴/۰۱/۰۱']
  ]){
    assert.equal(date.inputDate(iso),jalali);
    assert.equal(date.fromJalali(jalali),iso);
  }
  assert.equal(date.daysInMonth(1403,12),30);
  assert.equal(date.daysInMonth(1404,12),29);
  for(const invalid of ['1404/12/30','1405/07/31','1405/13/01','1405/00/01','not-a-date'])assert.equal(date.fromJalali(invalid),null);
});

test('notification time is Tehran time for UTC SQL and ISO timestamps across midnight',()=>{
  const date=dateFormatter();
  for(const value of ['2026-09-27T08:05:00Z','2026-09-27T08:05:00','2026-09-27 08:05:00.000']){
    assert.equal(date.parse(value).toISOString(),'2026-09-27T08:05:00.000Z');
    assert.match(date.format(value,{withTime:true}),/۱۱:۳۵/);
  }
  assert.equal(date.inputDate('2026-09-26T20:29:00Z'),'۱۴۰۵/۰۷/۰۴');
  assert.equal(date.inputDate('2026-09-26T20:30:00Z'),'۱۴۰۵/۰۷/۰۵');
});

test('admin payment display and customer picker preserve the selected calendar day',()=>{
  const OnPartDate=dateFormatter(),context={OnPartDate,Date};
  const admin=read('admin/payments.html'),customer=read('payment.html');
  vm.runInNewContext(admin.slice(admin.indexOf('function toJalali('),admin.indexOf('Admin.renderSidebar')),context);
  vm.runInNewContext(admin.slice(admin.indexOf('function jalaliDateToIso('),admin.indexOf('function renderManualUsers')),context);
  vm.runInNewContext(customer.slice(customer.indexOf('function formatPayDate('),customer.indexOf('function formatCard(')),context);
  vm.runInNewContext('let pdpSY=1405,pdpSM=7,pdpSD=5;'+customer.slice(customer.indexOf('function pdpDaysInMonth('),customer.indexOf('function pdpRender(')),context);
  const saved=context.pdpSelectedGregorianIso();
  assert.equal(saved,'2026-09-27');
  assert.equal(context.jalaliDateToIso('۱۴۰۵/۰۷/۰۵'),saved);
  assert.equal(context.toJalali(saved),'۱۴۰۵/۰۷/۰۵');
  assert.equal(context.formatPayDate(saved),'۱۴۰۵/۰۷/۰۵');
  assert.equal(context.pdpDow(1405,7,5),1); // Sunday, Saturday-first picker.
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
