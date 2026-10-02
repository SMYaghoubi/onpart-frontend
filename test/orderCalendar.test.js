const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const fa = value => String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

function dateContext() {
  const context = { Date, Intl, window: null };
  context.window = context;
  const source = read('js/api.js');
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('(function initOnPartDate'), source.indexOf('// OnPart API Helper')), context);
  return context;
}

const calendarCases = [
  ['2026-10-01T07:19:00Z', '۱۴۰۵/۰۷/۰۹'],
  ['2026-10-01 07:19:00', '۱۴۰۵/۰۷/۰۹'],
  ['2026-10-01', '۱۴۰۵/۰۷/۰۹'],
  ['2026-10-01T20:29:59Z', '۱۴۰۵/۰۷/۰۹'],
  ['2026-10-01T20:30:00Z', '۱۴۰۵/۰۷/۱۰'],
  ['2025-03-20T12:00:00Z', '۱۴۰۳/۱۲/۳۰'],
  ['2025-03-21T12:00:00Z', '۱۴۰۴/۰۱/۰۱']
];

for (const file of ['orders.html', 'admin/orders.html', 'admin/index.html', 'admin/invoices.html', 'admin/shipping.html', 'admin/users.html', 'admin/credit.html', 'admin/sms.html']) {
  test(`${file} renders the correct Persian day without adding a day`, () => {
    const context = dateContext(), source = read(file), start = source.indexOf('function toJalali(');
    vm.runInContext(source.slice(start, source.indexOf('\n\n', start)), context);
    for (const [timestamp, expected] of calendarCases) assert.equal(context.toJalali(timestamp), expected, timestamp);
    assert.equal(context.toJalali(null), '—');
    assert.equal(context.toJalali('invalid'), '—');
    if (file === 'orders.html') {
      assert.match(context.toJalali(calendarCases[0][0], true), /۱۴۰۵\/۰۷\/۰۹/);
      assert.match(context.toJalali(calendarCases[0][0], true), /۱۰:۴۹/);
    }
  });
}

function customerContext() {
  const context = dateContext(), source = read('orders.html'), elements = {};
  context.document = { getElementById(id) { return elements[id] ||= { value: '', innerHTML: '', textContent: '', classList: { add() {} } }; } };
  context.OnPart = { fa, fmt: String };
  context.API = { escapeHtml: String };
  vm.runInContext(source.slice(source.indexOf('function toJalali('), source.indexOf('async function loadMyOrders(')), context);
  vm.runInContext(source.slice(source.indexOf('// ── Jalali Datepicker'), source.indexOf('function openDp(')), context);
  vm.runInContext(source.slice(source.indexOf('function renderOrders('), source.indexOf('function renderConfirms(')), context);
  vm.runInContext(source.slice(source.indexOf('function openItems('), source.indexOf('function openShip(')), context);
  return { context, elements };
}

test('customer order list, detail and inclusive date filter agree on 9 Mehr', () => {
  const { context, elements } = customerContext();
  vm.runInContext(`myOrders=[
    {id:51,created_at:'2026-09-30T20:29:59Z',status:'pending_expert',total:1},
    {id:52,created_at:'2026-10-01T07:19:00Z',status:'pending_expert',total:1},
    {id:53,created_at:'2026-10-01T20:29:59Z',status:'pending_expert',total:1},
    {id:54,created_at:'2026-10-01T20:30:00Z',status:'pending_expert',total:1}
  ]; dpFromVal='1405/07/09'; dpToVal='1405/07/09'; renderOrders(); openItems(1);`, context);
  assert.equal(elements.filteredCount.textContent, '۲');
  assert.match(elements.ordersTbody.innerHTML, /۵۲/);
  assert.match(elements.ordersTbody.innerHTML, /۵۳/);
  assert.doesNotMatch(elements.ordersTbody.innerHTML, /۵۱|۵۴/);
  assert.match(elements.itemsModalBody.innerHTML, /۱۴۰۵\/۰۷\/۰۹/);
  assert.match(elements.itemsModalBody.innerHTML, /۱۰:۴۹/);
});

test('order datepicker uses Tehran today, correct weekdays and leap Esfand', () => {
  const { context, elements } = customerContext();
  assert.equal(context.dpDow(1405, 7, 9), 5); // Thursday in a Saturday-first calendar.
  const today = context.OnPartDate.parts(new Date());
  assert.equal(vm.runInContext('dpY', context), today.y);
  assert.equal(vm.runInContext('dpM', context), today.m);
  vm.runInContext("dpY=1403;dpM=12;renderDp('from')", context);
  assert.match(elements.dpFrom.innerHTML, /1403\/12\/30/);
  vm.runInContext("dpY=1404;dpM=12;renderDp('from')", context);
  assert.doesNotMatch(elements.dpFrom.innerHTML, /1404\/12\/30/);
});
