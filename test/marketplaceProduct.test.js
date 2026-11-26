const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../js/marketplace-product.js'),'utf8');
const sample={product:{id:10,description:'قطعه آزمایشی <نام>',code:'TEST-10',brand:'برند آزمایشی',image:null},offers:[{offer_token:'a'.repeat(32),offer_version:1,price:105000,quantity:3,label:'عرضه‌کننده AAAAAA'},{offer_token:'b'.repeat(32),offer_version:4,price:110000,quantity:7,label:'عرضه‌کننده BBBBBB'}]};
function harness({token='approved',fail=false,cart=[]}={}){
 const nodes=new Map(),calls=[],events={};let shouldFail=fail;
 function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',value:'',disabled:false,open:false,addEventListener(type,fn){(events[id]??={})[type]=fn;},querySelector:selector=>node(selector),showModal(){this.open=true},close(){this.open=false}});return nodes.get(id);}
 const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const context=vm.createContext({document:{getElementById:node},location:{search:'?id=10'},URLSearchParams,OnPartSession:{getToken:()=>token},API:{escapeHtml,BASE_URL:'https://isolated.invalid',safeUrl:value=>value.startsWith('https:')?value:'',request:async path=>{calls.push({path});if(shouldFail)throw Error('آزمایش قطع ارتباط');return structuredClone(sample);}},OnPart:{renderNavbar(){},getCart:async()=>cart,setCartItem:async(id,quantity,options)=>{calls.push({id,quantity,options});return true;}}});
 vm.runInContext(source,context);
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 return {nodes,calls,events,node,settle,setFail:v=>shouldFail=v,click:async(which)=>events.productContent.click({target:{closest:selector=>selector===(which.add!=null?'[data-add]':'[data-quantity]')?{dataset:which.add!=null?{add:String(which.add)}:{quantity:String(which.index),delta:String(which.delta)}}:null}})};
}
test('detail renders one master product and real anonymous offers, zero quantities, no invented image',async()=>{
 const h=harness();await h.settle();const html=h.node('productContent').innerHTML;
 assert.match(html,/قطعه آزمایشی &lt;نام&gt;/);assert.match(html,/تصویر محصول ثبت نشده/);assert.match(html,/عرضه‌کننده AAAAAA/);assert.match(html,/عرضه‌کننده BBBBBB/);assert.equal((html.match(/value="0"/g)||[]).length,2);assert.doesNotMatch(html,/<img/);assert.match(html,/هزینه پست جدا/);assert.match(html,/شهریار/);
});
test('selection starts at zero, is bounded by available inventory, and passes exact offer metadata to cart',async()=>{
 const h=harness();await h.settle();await h.click({add:0});assert.equal(h.calls.filter(c=>c.id).length,0);
 await h.click({index:1,delta:1});await h.click({add:1});let saved=h.calls.find(c=>c.id);assert.equal(saved.id,10);assert.equal(saved.quantity,1);assert.equal(saved.options.offer_token,'b'.repeat(32));assert.equal(saved.options.offer_version,4);assert.equal(saved.options.expected_price,110000);
 for(let i=0;i<6;i++)await h.click({index:0,delta:1});assert.equal(h.node('offerQty0').value,3);
 for(let i=0;i<5;i++)await h.click({index:0,delta:-1});assert.equal(h.node('offerQty0').value,0);
});
test('unapproved or missing sessions reveal no products; failed reads offer a real retry',async()=>{
 const no=harness({token:null});await no.settle();assert.equal(no.calls.length,0);assert.doesNotMatch(no.node('productContent').innerHTML,/قطعه آزمایشی|AAAAAA/);
 const h=harness({fail:true});await h.settle();assert.match(h.node('productContent').innerHTML,/آزمایش قطع ارتباط/);h.setFail(false);await h.events.retryOffers.click();await h.settle();assert.match(h.node('productContent').innerHTML,/عرضه‌کننده AAAAAA/);
});
test('only a still-valid previously selected offer is restored; a stale quote is not autoaccepted',async()=>{
 const cart=[{product_id:10,offer_token:'a'.repeat(32),qty:2,needs_review:false},{product_id:10,offer_token:'b'.repeat(32),qty:4,needs_review:true}];const h=harness({cart});await h.settle();const html=h.node('productContent').innerHTML;assert.match(html,/id="offerQty0"[^>]*value="2"/);assert.match(html,/id="offerQty1"[^>]*value="0"/);
});
test('detail uses current shared navigation and mobile touch controls with no fixed-width desktop shell',()=>{
 const html=fs.readFileSync(require.resolve('../product.html'),'utf8'),css=fs.readFileSync(require.resolve('../css/marketplace.css'),'utf8');assert.match(html,/id="navbar-placeholder"/);assert.match(html,/width=device-width/);assert.match(css,/@media\(max-width:800px\)/);assert.match(css,/height:44px/);assert.match(css,/grid-template-columns:1fr/);
});
