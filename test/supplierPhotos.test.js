const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Photos=require('../js/supplier-photos');
test('photo selection accepts the supported formats and rejects empty, oversized and active files',()=>{
  for(const type of ['image/jpeg','image/png','image/webp'])assert.equal(Photos.validate({size:100,type}).type,type);
  for(const file of [{size:0,type:'image/jpeg'},{size:Photos.maxBytes+1,type:'image/jpeg'},{size:100,type:'image/svg+xml'}])assert.throws(()=>Photos.validate(file));
});
test('untrusted photo ids cannot become markup and labels are escaped',()=>{
  assert.equal(Photos.markup('"><script>alert(1)</script>'),'');
  const markup=Photos.markup('11111111-1111-4111-8111-111111111111','<img src=x onerror=alert(1)>');
  assert.match(markup,/&lt;img/);assert.doesNotMatch(markup,/<img src=x/);
});
const source=fs.readFileSync(path.join(__dirname,'../supplier/index.html'),'utf8');
test('new-product drafts retain the uploaded photo id without changing numeric price and inventory',()=>{
  const fn=source.slice(source.indexOf('    function stageNew('),source.indexOf("    el('entryForm').addEventListener"));
  const browser={};new Function('window',fs.readFileSync(path.join(__dirname,'../js/supplier-brands.js'),'utf8'))(browser);
  const SupplierBrands=browser.SupplierBrands,API={normalizeProductCode:s=>s.replace(/-/g,'').toLowerCase()},brands=['خاتم'];
  const stage=new Function('SupplierBrands','API','brands','codeIndex',fn+';return stageNew;')(SupplierBrands,API,brands,new Map());
  const draft=new Map(),id='11111111-1111-4111-8111-111111111111';
  stage({code:'NEW-1',description:'کالای آزمایشی',brand:'خاتم',supplier_price:50000,quantity:4,available:true,image_id:id},draft);
  assert.deepEqual([...draft.values()][0],{new_product:true,code:'NEW-1',description:'کالای آزمایشی',brand:'خاتم',supplier_price:50000,quantity:4,available:true,image_id:id});
});
test('photo-only drafts survive price and quantity edits, and cancelling the proposed photo removes only that field',()=>{
  const fn=source.slice(source.indexOf('    function draftChange('),source.indexOf('    function editRow('));
  const draft=new Map(),effectiveQuantity=(p,e)=>e.quantity??p.quantity;
  const change=new Function('draft','effectiveQuantity',fn+';return draftChange;')(draft,effectiveQuantity);
  const product={id:10,code:'EX-10',supplier_price:50000,quantity:4,available:1},id='11111111-1111-4111-8111-111111111111';
  change(product,{image_id:id});assert.equal(draft.get('p:10').image_id,id);
  change(product,{quantity:5});assert.equal(draft.get('p:10').image_id,id);assert.equal(draft.get('p:10').quantity,5);
  change(product,{image_id:null});assert.equal(draft.get('p:10').image_id,undefined);assert.equal(draft.get('p:10').quantity,5);
  change(product,{quantity:4});assert.equal(draft.size,0);
});

