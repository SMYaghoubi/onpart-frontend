const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const publicPage = read('cooperation.html');
const adminPage = read('admin/partners.html');
const requiredTypes = ['فروشگاه لوازم یدکی', 'شرکت تأمین‌کننده', 'تولیدکننده', 'پخش‌کننده', 'انباردار'];

function options(html, id) {
  const select = html.match(new RegExp(`<select[^>]*id="${id}"[^>]*>([\\s\\S]*?)</select>`));
  assert.ok(select, id);
  return [...select[1].matchAll(/<option(?: value="([^"]*)")?>([^<]*)<\/option>/g)]
    .map(match => match[1] ?? match[2]);
}

function functionSource(html, name) {
  const start = html.search(new RegExp(`(?:async )?function ${name}\\(`));
  assert.ok(start >= 0, name);
  return html.slice(start, html.indexOf('\n}', start) + 2);
}

test('public and management registration retain legacy activity types and offer all supplier businesses', () => {
  const publicOptions = options(publicPage, 's_type');
  assert.deepEqual(options(adminPage, 'a_type'), publicOptions);
  for (const value of [...requiredTypes, 'وارد‌کننده', 'عمده‌فروش', 'توزیع‌کننده', 'سایر']) {
    assert.ok(publicOptions.includes(value), value);
  }
});

for (const type of requiredTypes) {
  test(`${type} submits through the existing supplier registration endpoint without company registration details`, async () => {
    const nodes = Object.fromEntries(['s_company', 's_name', 's_mobile', 's_city', 's_type', 's_terms',
      's_province', 's_address', 's_email', 's_phone', 's_website', 's_reg', 's_year',
      's_inventory', 's_shipping', 's_desc', 'submitBtn', 'sucOverlay'].map(id => [id, { value:'', classList:{ add() {} } }]));
    for (const [id, value] of Object.entries({ s_company:'مجموعه آزمایشی', s_name:'مسئول آزمایشی',
      s_mobile:'09120000000', s_city:'شهریار', s_type:type })) nodes[id].value = value;
    nodes.s_terms.checked = true;
    const sent = [];
    const context = vm.createContext({
      brands:['ایساکو'], selectedBrandIds:new Set(['1']), alert:message => assert.fail(message),
      document:{ getElementById:id => nodes[id], querySelectorAll:() => [{ value:'engine' }] },
      fetch:async (url, request) => { sent.push({ url, payload:JSON.parse(request.body) }); return { ok:true }; }
    });
    vm.runInContext(functionSource(publicPage, 'submitSupplier'), context);
    await vm.runInContext('submitSupplier()', context);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, 'https://onpartpadmin.liara.run/api/suppliers');
    assert.equal(sent[0].payload.type, type);
    assert.equal(sent[0].payload.reg_number, '');
    assert.equal(sent[0].payload.categories, 'engine');
    assert.equal(sent[0].payload.brands, 'ایساکو');
    assert.deepEqual(sent[0].payload.brand_ids,[1]);
    assert.ok(!Object.hasOwn(sent[0].payload, 'status'));
    assert.ok(!Object.hasOwn(sent[0].payload, 'portal_enabled'));
  });
}

test('management editing keeps each supplier activity selected, including legacy custom values', () => {
  for (const type of [...options(publicPage, 's_type').filter(Boolean), 'فعالیت قدیمی <ویژه>']) {
    const nodes = {
      a_type:{ options:options(adminPage, 'a_type').map(value => ({ value })) },
      modalTitle:{}, supplierModalBody:{}, supplierModalFoot:{}, supplierModal:{ classList:{ add() {} } }
    };
    const context = vm.createContext({
      filtered:[{ id:7, type }], curId:null,
      document:{ getElementById:id => nodes[id] },
      API:{ escapeHtml:value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
    });
    vm.runInContext(functionSource(adminPage, 'openEdit') + '\nopenEdit(0)', context);
    const escaped = context.API.escapeHtml(type);
    assert.ok(nodes.supplierModalBody.innerHTML.includes(`<option value="${escaped}" selected>${escaped}</option>`), type);
    assert.ok(!nodes.supplierModalBody.innerHTML.includes('فعالیت قدیمی <ویژه>'));
  }
});
