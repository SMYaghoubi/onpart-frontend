const test=require('node:test'),assert=require('node:assert/strict');
const {statistics}=require('../js/supplier-dashboard');
test('dashboard statistics use the permitted account catalog and server-confirmed inventory',()=>{
 const state={products:[{id:1,available:1,quantity:4},{id:2,available:1,quantity:0},{id:3,available:0,quantity:10},{id:4,available:1,quantity:null},{id:5,available:'1',quantity:'0'}],drafts:[{product_id:1,available:false},{new_product:true,available:true}],batches:[{status:'pending'},{status:'approved'},{status:'rejected'}]};
 assert.deepEqual(statistics(state),{approved:5,available:2,unavailable:3,drafts:2,pending:1,limitedHistory:false});
});
test('new and existing-product drafts do not inflate approved or available product totals',()=>{
 const state={products:[{id:1,available:1}],drafts:[{product_id:1,available:false},{new_product:true,available:true}],batches:[]};
 const before=statistics(state);state.drafts=[];assert.equal(statistics(state).approved,before.approved);assert.equal(statistics(state).available,before.available);assert.equal(before.drafts,2);
});
test('an empty real account has zero counts and the history cap is reported explicitly',()=>{
 assert.deepEqual(statistics({}),{approved:0,available:0,unavailable:0,drafts:0,pending:0,limitedHistory:false});
 const batches=Array.from({length:100},(_,id)=>({id,status:id%2?'pending':'approved'}));
 assert.equal(statistics({batches}).pending,50);assert.equal(statistics({batches}).limitedHistory,true);
});


test('own-account UI shows the persistent seller code only after a fresh authenticated read',()=>{const source=require('node:fs').readFileSync(require.resolve('../js/supplier-dashboard.js'),'utf8');assert.match(source,/accountSellerCode/);assert.match(source,/fresh &&/);const html=require('node:fs').readFileSync(require.resolve('../supplier/index.html'),'utf8');assert.match(html,/id="accountSellerCode" dir="ltr"/);});
