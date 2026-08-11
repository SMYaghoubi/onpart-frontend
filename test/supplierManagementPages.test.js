const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const read=file=>fs.readFileSync(path.join(__dirname,'..','admin',file),'utf8');

for(const file of ['supplier-access.html','supplier-updates.html']){
  test(`${file} uses explicit admin auth context for supplier management endpoints`,()=>{
    const source=read(file);
    assert.match(source,/const adminRequest=.*authContext:'admin'/);
    assert.doesNotMatch(source,/API\.request\(['"`]\/api\/supplier-portal/);
    assert.doesNotMatch(source,/op_token|op_supplier_token|getToken\('supplier'\)/);
  });
}

test('supplier updates distinguishes auth error from a real empty list',()=>{
  const source=read('supplier-updates.html');
  assert.match(source,/نشست مدیریت منقضی شده یا مجوز کافی نیست/);
  assert.match(source,/ورود دوباره به پنل مدیریت/);
  assert.match(source,/موردی وجود ندارد/);
});

test('supplier access loads and saves scopes and preserves existing zero-count brands',()=>{
  const source=read('supplier-access.html');
  assert.match(source,/scope-options/);
  assert.match(source,/suppliers\/\$\{supplierId\}\/scopes/);
  assert.match(source,/product_count:0/);
  assert.match(source,/method:'PUT'/);
});
