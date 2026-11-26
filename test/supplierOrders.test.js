const test=require('node:test'),assert=require('node:assert/strict');
const {orderCard,itemCard,money}=require('../js/supplier-orders');
global.API={formatDate:()=> 'تاریخ آزمایشی'};
test('order cards label supplier line values without implying a wallet balance',()=>{
 const html=orderCard({id:12,status:'preparing',line_count:1,quantity:3,supplier_total:300000});
 assert.ok(html.includes('ارزش اقلام به قیمت همکاری شما'));
 assert.ok(html.includes('data-seller-order="12"'));
 assert.ok(!html.includes('قابل برداشت'));
});
test('unknown supplier prices remain explicitly unknown instead of zero or the selling price',()=>{
 assert.equal(money(null),'نیازمند بررسی مدیریت');
 assert.notEqual(money(0),money(null));
 const html=itemCard({description:'test',quantity:2,supplier_price:null,supplier_total:null});
 assert.equal((html.match(/نیازمند بررسی مدیریت/g)||[]).length,2);
});
test('historical product names, codes and brand labels are rendered as text',()=>{
 const html=itemCard({description:'<script>attack</script>',brand:'<img src=x onerror=alert(1)>',code:'<svg>',quantity:1,supplier_price:100000,supplier_total:100000});
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&lt;svg&gt;'));
});

const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function harness(responder){
 const nodes={},requests=[];
 const document={getElementById(id){return nodes[id]||=( {value:'',hidden:false,disabled:false,innerHTML:'',textContent:'',handlers:{},addEventListener(name,fn){this.handlers[name]=fn;},setAttribute(){},focus(){},scrollIntoView(){},querySelector(){return {focus(){}};}} );}};
 const context=vm.createContext({module:{exports:{}},document,API:{formatDate:()=> 'تاریخ آزمایشی'},console});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/supplier-orders.js'),'utf8'),context);
 const api=context.module.exports;
 api.init({request:async url=>{requests.push(url);return responder(url);}});
 return {api,nodes,requests};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const sample=id=>({id,status:'preparing',created_at:'2026-11-26',line_count:1,quantity:2,supplier_total:200000});

test('order view loads, pages, filters, reports a failed fetch and recovers on retry',async()=>{
 let fail=false;
 const h=harness(async url=>{
  if(fail)throw new Error('دریافت آزمایشی ناموفق');
  const u=new URL(url,'https://isolated.invalid');
  return {orders:u.searchParams.get('page')==='2'?[sample(21)]:[sample(1)],total:21,page:Number(u.searchParams.get('page')),limit:20};
 });
 await h.api.load();assert.ok(h.nodes.sellerOrderList.innerHTML.includes('سفارش ۱'));
 assert.equal(h.nodes.sellerOrderPrev.disabled,true);assert.equal(h.nodes.sellerOrderNext.disabled,false);
 h.nodes.sellerOrderNext.handlers.click();await settle();assert.ok(h.requests.at(-1).includes('page=2'));
 assert.equal(h.nodes.sellerOrderNext.disabled,true);
 h.nodes.sellerOrderStatus.value='shipping';h.nodes.sellerOrderStatus.handlers.change();await settle();
 assert.equal(h.requests.at(-1),'/orders?page=1&status=shipping');
 fail=true;await h.api.load();assert.ok(h.nodes.sellerOrderList.innerHTML.includes('role="alert"'));
 assert.equal(h.nodes.sellerOrderRefresh.disabled,false);
 fail=false;h.nodes.sellerOrderRefresh.handlers.click();await settle();
 assert.ok(!h.nodes.sellerOrderList.innerHTML.includes('role="alert"'));
});

test('late filter responses cannot overwrite the current result',async()=>{
 const pending=[];const h=harness(url=>new Promise(resolve=>pending.push({url,resolve})));
 const first=h.api.load();h.nodes.sellerOrderStatus.value='delivered';const second=h.api.load(true);
 pending[1].resolve({orders:[sample(2)],total:1});await second;
 const current=h.nodes.sellerOrderList.innerHTML;
 pending[0].resolve({orders:[sample(1)],total:1});await first;
 assert.equal(h.nodes.sellerOrderList.innerHTML,current);
});

test('details show only the response items and late responses do not reopen a closed panel',async()=>{
 let resolveDetail;
 const h=harness(url=>url.includes('/orders/')?new Promise(resolve=>{resolveDetail=resolve;}):Promise.resolve({orders:[sample(1)],total:1}));
 await h.api.load();
 h.nodes.sellerOrderList.handlers.click({target:{closest:()=>({dataset:{sellerOrder:'1'}})}});await settle();
 assert.equal(h.nodes.sellerOrderDetails.hidden,false);
 resolveDetail({...sample(1),items:[{description:'کالای تست',code:'TEST-1',quantity:2,supplier_price:100000,supplier_total:200000}]});await settle();
 assert.ok(h.nodes.sellerOrderDetailBody.innerHTML.includes('TEST-1'));
 h.nodes.sellerOrderList.handlers.click({target:{closest:()=>({dataset:{sellerOrder:'2'}})}});await settle();
 h.nodes.sellerOrderDetailClose.handlers.click();resolveDetail({...sample(2),items:[{description:'late response'}]});await settle();
 assert.equal(h.nodes.sellerOrderDetails.hidden,true);
 assert.ok(!h.nodes.sellerOrderDetailBody.innerHTML.includes('late response'));
});
