const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('single, Excel and pasted entries preserve the authorized GISP brand', () => {
  const html = fs.readFileSync(require.resolve('../supplier/index.html'), 'utf8');
  const helper = fs.readFileSync(require.resolve('../js/supplier-brands.js'), 'utf8');
  const context = vm.createContext({ window:{}, brands:['GISP |  جی آی اس پی'],
    API:{ normalizeProductCode:value => value.toLowerCase() }, codeIndex:new Map() });
  vm.runInContext(helper, context);
  context.SupplierBrands = context.window.SupplierBrands;
  vm.runInContext(html.slice(html.indexOf('    function stageNew('), html.indexOf("    el('entryForm').addEventListener")), context);
  const input = { code:'GI-123', description:'Test product', brand:'GISP | جی آی اس پی', supplier_price:200000, quantity:5 };
  context.input = input;
  const result = vm.runInContext('(() => { const draft = new Map(); stageNew(input, draft); return [...draft.values()][0]; })()', context);
  assert.equal(result.brand, 'GISP |  جی آی اس پی');
  assert.equal(result.quantity, 5);
  context.input = { ...input, brand:'unauthorized' };
  assert.throws(() => vm.runInContext('stageNew(input, new Map())', context), /برند/);
});
