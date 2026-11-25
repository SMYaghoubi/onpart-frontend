const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require.resolve('../supplier/index.html'), 'utf8');
const brandSource = fs.readFileSync(require.resolve('../js/supplier-brands.js'), 'utf8');
const approved = { id:1, code:'GI-100', description:'کالای تأییدشده', brand:'GISP', supplier_price:100, quantity:3, available:1 };
const proposal = { new_product:true, code:'GI-200', description:'سلام <قطعه>', brand:'GISP', supplier_price:200, quantity:5, available:true };

async function portal({ pending = [], saved = null, catalog = [approved], failLoad = false } = {}) {
  const nodes = new Map(), storage = new Map(), sent = [];
  if (saved) storage.set('onpart-supplier-draft-42', JSON.stringify(saved));
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, { value:'', innerHTML:'', textContent:'', hidden:false,
      classList:{ toggle() {} }, addEventListener() {}, querySelectorAll:() => [],
      querySelector:() => null, showModal() { this.open = true; }, close() { this.open = false; } });
    return nodes.get(id);
  }
  const state = { catalog, pending, failLoad, failSubmit:false };
  const context = vm.createContext({
    SupplierPhotos:{ markup:() => '', load() {}, validId:() => false },
    window:{}, location:{ replace() {} }, crypto:require('node:crypto').webcrypto,
    OnPartSession:{ getUser:() => ({ id:42 }), getToken:() => 'test-session', clear() {} },
    localStorage:{ getItem:key => storage.get(key) ?? null, setItem:(key, value) => storage.set(key, value) },
    document:{ getElementById:node, querySelectorAll:() => [] },
    API:{
      safeUrl:() => '',
      escapeHtml:value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])),
      normalizeProductCode:value => String(value ?? '').replace(/[۰-۹٠-٩]/g, c => c.charCodeAt(0) & 15).toLowerCase().replace(/[\s-]/g, ''),
      formatDate:() => 'test-date',
      request:async (path, options = {}) => {
        if (options.method === 'POST') {
          if (state.failSubmit) throw new Error('آزمایش قطع ارتباط');
          const body = JSON.parse(options.body); sent.push(body);
          state.pending = body.items.filter(row => row.new_product).map((row, i) => ({ ...row, id:i+1, batch_id:9 }));
          return { id:9, message:'تغییرات برای بررسی ارسال شد' };
        }
        if (state.failLoad) throw new Error('آزمایش قطع ارتباط');
        if (path.endsWith('/products')) return { products:state.catalog, pending_products:state.pending, brands:['GISP'] };
        if (path.endsWith('/updates')) return { batches:[] };
        throw new Error('Unexpected test request: ' + path);
      }
    }
  });
  vm.runInContext(brandSource, context);
  context.SupplierBrands = context.window.SupplierBrands;
  vm.runInContext(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1], context);
  await new Promise(setImmediate);
  return { run:source => vm.runInContext(source, context), node, state, sent, storage };
}

test('new drafts are visible and searchable with quantity, price and escaped names', async () => {
  const p = await portal();
  p.run(`stageNew(${JSON.stringify(proposal)},draft); persistDraft(); renderProducts()`);
  let rows = p.node('productList').innerHTML;
  assert.match(rows, /data-product-state="draft"/);
  assert.match(rows, /پیش‌نویس — ارسال نشده/);
  assert.match(rows, /سلام &lt;قطعه&gt;/);
  assert.match(rows, /readonly value="200"/);
  assert.match(rows, /readonly value="5"/);
  p.node('search').value = 'GI-۲۰۰'; p.run('renderProducts()');
  rows = p.node('productList').innerHTML;
  assert.match(rows, /سلام/);
  assert.doesNotMatch(rows, /کالای تأییدشده/);
  assert.equal(JSON.parse(p.storage.get('onpart-supplier-draft-42')).items.length, 1);
});

test('saved drafts survive reopening and failed catalog requests', async () => {
  const saved = { items:[['n:gi200:gisp', proposal]], source:'manual' };
  for (const failLoad of [false, true]) {
    const p = await portal({ saved, failLoad });
    assert.match(p.node('productList').innerHTML, /پیش‌نویس — ارسال نشده/);
    assert.equal(p.run('draft.size'), 1);
  }
});

test('accepted submission becomes a pending row, then an approved catalog product after review', async () => {
  const p = await portal();
  p.run(`stageNew(${JSON.stringify(proposal)},draft); persistDraft(); renderProducts()`);
  await p.run('submitChanges()');
  assert.equal(p.sent.length, 1);
  assert.equal(p.run('draft.size'), 0);
  assert.match(p.node('productList').innerHTML, /در انتظار تأیید مدیریت/);
  assert.doesNotMatch(p.node('productList').innerHTML, /data-product-state="draft"/);
  p.state.pending = [];
  p.state.catalog = [approved, { ...proposal, new_product:undefined, id:2 }];
  await p.run('load()');
  assert.doesNotMatch(p.node('productList').innerHTML, /data-product-state="pending"/);
  assert.equal((p.node('productList').innerHTML.match(/id="row2"/g) || []).length, 1);
  assert.equal(p.run('products.size'), 2);
});

test('failed submission retains the visible draft and permits retry', async () => {
  const p = await portal();
  p.run(`stageNew(${JSON.stringify(proposal)},draft); persistDraft(); renderProducts()`);
  p.state.failSubmit = true;
  await p.run('submitChanges()');
  assert.equal(p.run('draft.size'), 1);
  assert.match(p.node('productList').innerHTML, /پیش‌نویس — ارسال نشده/);
  assert.match(p.node('draftError').textContent, /قطع ارتباط/);
  assert.equal(p.node('submitBtn').disabled, false);
});

test('pending request ids cannot collide with approved ids in bulk selection', async () => {
  const p = await portal({ pending:[{ ...proposal, id:1, batch_id:9, quantity:0, available:1 }] });
  p.run('selectFiltered()');
  assert.deepEqual(Array.from(p.run('[...selected]')), [1]);
  const rows = p.node('productList').innerHTML;
  assert.match(rows, /در انتظار تأیید مدیریت/);
  assert.match(rows, /disabled aria-label="وضعیت پیشنهادی موجودی[^>]*aria-checked="false"/);
  p.node('search').value = 'سلام'; p.run('clearSelection(); selectFiltered()');
  assert.equal(p.run('selected.size'), 0);
});

test('existing catalog rows distinguish an unsent change and revert after draft removal', async () => {
  const p = await portal();
  p.run('draftChange(products.get(1),{quantity:6}); persistDraft(); renderProducts()');
  assert.match(p.node('productList').innerHTML, /پیش‌نویس تغییرات/);
  p.run('removeDraft("p:1")');
  assert.doesNotMatch(p.node('productList').innerHTML, /پیش‌نویس تغییرات/);
  assert.match(p.node('productList').innerHTML, /تأیید شده/);
});


test('dashboard filters preserve approved, pending and local draft product identities', async () => {
  const p = await portal({pending:[{...proposal,id:1,batch_id:9}]});
  p.run('draftChange(products.get(1),{quantity:6}); persistDraft(); renderProducts()');
  p.node('productStatus').value='draft';p.run('renderProducts()');
  assert.match(p.node('productList').innerHTML,/پیش‌نویس تغییرات/);
  assert.doesNotMatch(p.node('productList').innerHTML,/در انتظار تأیید مدیریت/);
  p.node('productStatus').value='pending';p.run('renderProducts()');
  assert.match(p.node('productList').innerHTML,/در انتظار تأیید مدیریت/);
  assert.doesNotMatch(p.node('productList').innerHTML,/id="row1"/);
  p.node('productStatus').value='approved';p.run('renderProducts()');
  assert.match(p.node('productList').innerHTML,/id="row1"/);
  assert.doesNotMatch(p.node('productList').innerHTML,/data-product-state="pending"/);
});

test('availability filters use confirmed account data rather than unsubmitted stock changes', async () => {
  const p=await portal({catalog:[approved,{...approved,id:2,code:'GI-2',quantity:0,available:1}]});
  p.run('draftChange(products.get(1),{available:false}); persistDraft()');
  p.node('productStatus').value='available';p.run('renderProducts()');
  assert.match(p.node('productList').innerHTML,/id="row1"/);
  assert.doesNotMatch(p.node('productList').innerHTML,/id="row2"/);
  p.node('productStatus').value='unavailable';p.run('renderProducts()');
  assert.match(p.node('productList').innerHTML,/id="row2"/);
  assert.doesNotMatch(p.node('productList').innerHTML,/id="row1"/);
});
