const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('management can find the real account by its public seller code, including Persian digit input',()=>{
 const html=fs.readFileSync(require.resolve('../admin/partners.html'),'utf8'),nodes={searchInp:{value:'OP-۴۸۲۷۳۱'},statusF:{value:''},supplierCount:{textContent:''},supplierTbody:{innerHTML:''}};
 const context=vm.createContext({document:{getElementById:id=>nodes[id]},API:{escapeHtml:v=>String(v),formatDate:()=>''},fa:String,statusCls:{approved:'ok'},statusFa:{approved:'approved'},suppliers:[{id:1,company:'Owner One',status:'approved',seller_code:'OP-482731'},{id:2,company:'Owner Two',status:'approved',seller_code:'OP-753824'}],filtered:[]});
 vm.runInContext(html.slice(html.indexOf('function renderTable(){'),html.indexOf('function reviewSupplier(')),context);vm.runInContext('renderTable()',context);
 assert.equal(nodes.supplierCount.textContent,'1');assert.match(nodes.supplierTbody.innerHTML,/OP-482731/);assert.match(nodes.supplierTbody.innerHTML,/Owner One/);assert.doesNotMatch(nodes.supplierTbody.innerHTML,/Owner Two/);
});
test('own account code is read-only, fresh, and separate from approval and business-name fields',()=>{
 const source=fs.readFileSync(require.resolve('../js/supplier-dashboard.js'),'utf8'),nodes={};
 const context=vm.createContext({node:id=>nodes[id]??={textContent:''},config:{supplier:{company:'Fallback'}},fa:String});
 vm.runInContext(source.slice(source.indexOf('  function renderAccount('),source.indexOf('  function init(')),context);
 vm.runInContext("renderAccount({company:'Owner',seller_code:'OP-482731',status:'approved'},true)",context);assert.equal(nodes.accountSellerCode.textContent,'OP-482731');
 vm.runInContext("renderAccount({company:'Owner',seller_code:'OP-482731',status:'approved'},false)",context);assert.equal(nodes.accountSellerCode.textContent,'—');
});
