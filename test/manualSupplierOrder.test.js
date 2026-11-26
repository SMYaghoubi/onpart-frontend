const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../admin/orders.html'),'utf8');
function source(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert.ok(start>=0);return html.slice(start,html.indexOf('\n}',start)+2);}
async function run({selected=true,ok=true}={}){
 const sent=[],messages=[],orders=[];
 const row={id:'norow_0',dataset:{productId:selected?'11':''},querySelector:()=>({value:'کالای آزمایشی'})};
 const nodes={noqty_0:{value:'2'},noprice_0:{value:'210000'},nodisc_0:{value:'10'},no_discount:{value:'5'},no_status:{value:'pending_expert'},no_note:{value:'test'}};
 const context=vm.createContext({selectedCustomer:{id:101,name:'test',phone:'09000000101'},document:{querySelectorAll:()=>[row],getElementById:id=>nodes[id]},OnPartSession:{getToken:()=> 'isolated-admin'},API:{BASE_URL:'https://isolated.invalid'},fetch:async(url,options)=>{sent.push(JSON.parse(options.body));return {ok,json:async()=>ok?{id:42,total:359100}:{message:'خطای آزمایشی ثبت'}};},toast:(...args)=>messages.push(args),orders,filtered:[],renderTable(){},updateStats(){},closeNewOrder(){}});
 vm.runInContext(source('submitNewOrder'),context);await vm.runInContext('submitNewOrder()',context);
 return {sent,messages,orders};
}
test('manual order sends selected product IDs and the existing overall discount',async()=>{
 const r=await run();assert.equal(r.sent.length,1);assert.equal(r.sent[0].items[0].product_id,11);assert.equal(r.sent[0].overall_discount,5);assert.equal(r.orders[0].id,42);
});
test('unlinked text rows are explained before submission and failed saves create no fake local order',async()=>{
 const missing=await run({selected:false});assert.equal(missing.sent.length,0);assert.equal(missing.orders.length,0);
 const failure=await run({ok:false});assert.equal(failure.orders.length,0);assert.equal(failure.messages[0][0],'خطای آزمایشی ثبت');
});
