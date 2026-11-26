const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'), path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../admin/partners.html'),'utf8');
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert.ok(start>=0);return html.slice(start,html.indexOf('\n}',start)+2);}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

test('review presents declared brands and one combined approval without granting permissions',()=>{
  for(const status of ['pending','approved']){
    const nodes={modalTitle:{},supplierModalBody:{},supplierModalFoot:{},supplierModal:{classList:{add(){}}}};
    const context=vm.createContext({filtered:[{id:42,status,brands:'ایساکو، <script>test</script>'}],catLabels:{},API:{escapeHtml:escape},document:{getElementById:id=>nodes[id]}});
    vm.runInContext(source('openDetail')+'\nopenDetail(0)',context);
    assert.ok(nodes.supplierModalBody.innerHTML.includes(escape('ایساکو، <script>test</script>')));
    assert.ok(!nodes.supplierModalBody.innerHTML.includes('<script>test</script>'));
    assert.ok(nodes.supplierModalFoot.innerHTML.includes('approveSupplier(42)'));
    assert.ok(nodes.supplierModalFoot.innerHTML.includes('openEdit(0)'));
    assert.ok(!nodes.supplierModalFoot.innerHTML.includes('approveSupplier(42);closeSupplierModal()'));
  }
});

async function submit(ok){
  const messages=[],sent=[],button={disabled:false};let closed=0,reloaded=0;
  const context=vm.createContext({suppliers:[{id:42,brands:'ایساکو، سایپا یدک'}],OnPartSession:{getToken:()=> 'management-test'},API:{BASE_URL:'https://isolated.invalid'},document:{getElementById:()=>button},Admin:{toast:(...args)=>messages.push(args)},closeSupplierModal:()=>{closed++;},loadSuppliers:async()=>{reloaded++;},fetch:async(url,options)=>{assert.equal(button.disabled,true);sent.push({url,options});return {ok,json:async()=>({message:ok?'حساب و برندها تأیید شدند':'برند نامعتبر است'})};}});
  vm.runInContext(source('approveSupplier'),context);
  await vm.runInContext('approveSupplier(42)',context);
  return {messages,sent,button,closed,reloaded};
}

test('combined approval sends the reviewed brand snapshot and closes only after success',async()=>{
  const r=await submit(true);
  assert.deepEqual(JSON.parse(r.sent[0].options.body),{expected_brands:'ایساکو، سایپا یدک',confirm_brands:true});
  assert.equal(r.sent[0].options.headers.Authorization,'Bearer management-test');
  assert.equal(r.closed,1);assert.equal(r.reloaded,1);assert.equal(r.button.disabled,false);
});

test('invalid brands leave the review open, show the backend reason and allow correction',async()=>{
  const r=await submit(false);
  assert.equal(r.closed,0);assert.equal(r.reloaded,0);assert.equal(r.button.disabled,false);
  assert.deepEqual(r.messages,[['برند نامعتبر است',false]]);
});
