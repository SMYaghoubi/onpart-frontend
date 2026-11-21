const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','shop.html'),'utf8');
const viewSource=fs.readFileSync(path.join(__dirname,'..','js','shop-cards.js'),'utf8');
const products=[
  {id:1,description:'محصول آزمایشی یک',brand:'پولاسا',code:'POLA-001',car:'مشترک',category:'شلنگ سوخت',price:10000,available:true,image:'/uploads/test.jpg'},
  {id:2,description:'محصول آزمایشی دو',brand:'خاتم',code:'KHA-002',car:'پژو ۲۰۶',category:'شلنگ بای پس',price:20000,available:false}
];
function createShopHarness(shopHtml,viewSource,config={},URLClass=URL) {
  const nodes=new Map(),dynamic=new Map(),calls=[],timers=[];
  const state={token:config.token===undefined?'approved-test-token':config.token,
    products:config.products||[],cart:config.cart||[],saveSucceeds:true,deny:Boolean(config.deny),settings:config.settings||{currency:'تومان'}};
  function element(id='',tag='div'){
    const e={id,tag,value:'',hidden:false,style:{},attrs:{},children:[],options:[],open:false,isConnected:true,
      className:'',innerText:'',_html:'',textContent:'',_owned:[],
      addEventListener(){},setAttribute(k,v){this.attrs[k]=String(v);},getAttribute(k){return this.attrs[k]??null;},
      removeAttribute(k){delete this.attrs[k];if(k==='src')this.src='';},focus(){},showModal(){this.open=true;},close(){this.open=false;},
      contains(){return false;},querySelector(){return null;},querySelectorAll(){return [];},
      appendChild(child){this.children.push(child);},replaceChildren(...children){
        this.children=children;
        if(this.tag==='select'){this.options=children.flatMap(c=>c.children||[c]);return;}
        this.innerHTML=children.map(c=>c.html||c._html||(c.children||[]).map(x=>x.html||x._html||'').join('')).join('');
      }};
    const classes=new Set();e.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),toggle(c,on){if(on===undefined)on=!classes.has(c);if(on)classes.add(c);else classes.delete(c);},contains:c=>classes.has(c)};
    Object.defineProperty(e,'innerHTML',{get(){return this._html;},set(value){
      this._owned.forEach(key=>dynamic.delete(key));this._owned=[];this._html=String(value);
      if(['shopCards','tbody'].includes(this.id))for(const match of this._html.matchAll(/<([a-z]+)\b([^>]*?)\bid="([^"]+)"([^>]*)>/g)){
        const child=element(match[3],match[1]),attrs=match[2]+match[4];
        const value=attrs.match(/\bvalue="([^"]*)"/);if(value)child.value=value[1];
        dynamic.set(child.id,child);this._owned.push(child.id);
      }
    }});
    Object.defineProperty(e,'selectedOptions',{get(){return this.options.filter(o=>o.value===this.value);}});
    if(tag==='template')Object.defineProperty(e,'content',{get(){return {html:this._html};}});
    return e;
  }
  const staticIds=['shopCards','shopList','shopCardsView','shopListView','shopMore','shopResults','tbody','pgInfo','priceHeader','filterSummary','cartCount','cartCountBtn','clearCartButton','totalBar','totalBarVal','cartBody','cartTotal','cartOverlay','cartPanel','clearCartDialog','clearCartCancel','clearCartConfirm','shopImageDialog','shopImageTitle','shopImageError','shopImageZoom','notifPanel','notifBtn','notifDot','notifList'];
  staticIds.forEach(id=>nodes.set(id,element(id)));
  for(const id of ['fText','fCar','fBrand','fCat'])nodes.set(id,element(id,id==='fText'?'input':'select'));
  const document={getElementById:id=>nodes.get(id)||dynamic.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],
    addEventListener(){},head:element(),body:element(),createElement:tag=>element('',tag),
    createDocumentFragment:()=>({children:[],appendChild(child){this.children.push(child);},get html(){return this.children.map(c=>c.html||c._html||'').join('');}})};
  const storage=new Map(config.storage||[]),localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))};
  const window={localStorage,location:{origin:'https://onpart.ir',href:''},addEventListener(){}};
  const module={exports:{}};new Function('module','exports','URL',viewSource)(module,module.exports,URLClass);
  const API={BASE_URL:'https://onpartpadmin.liara.run',
    normalizeProductCode:value=>String(value||'').replace(/[۰-۹٠-٩]/g,c=>c.charCodeAt(0)&15).replace(/[\s-]/g,'').toLowerCase(),
    formatDate:()=>'',request:async(path)=>{
      calls.push({path});
      if(path==='/api/settings')return state.settings;
      if(path.startsWith('/api/products')){
        if(state.deny)throw Object.assign(new Error('not approved'),{status:403});
        if(path.includes('metadata'))return {cars:['پژو ۲۰۶','مشترک'],brands:['پولاسا','خاتم'],categories:['شلنگ سوخت','شلنگ بای پس']};
        return {products:state.products};
      }
      if(path==='/api/announcements')return {announcements:[]};
      if(path==='/api/user-notifications')return {notifications:[]};
      throw new Error('Unexpected test API '+path);
    }};
  const OnPart={renderNavbar(){},toast(){},playUserNotificationSound(){},getCart:async()=>state.cart,
    setCartItem:async(id,quantity,options)=>{
      calls.push({save:id,quantity,options});if(!state.saveSucceeds)return false;
      state.cart=state.cart.filter(p=>p.product_id!==id);
      if(quantity)state.cart.push({product_id:id,qty:quantity});
      return true;
    },clearCart:async()=>{state.cart=[];return true;}};
  const source=shopHtml.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  const runtime=new Function('window','document','OnPart','OnPartSession','API','OnPartShopView','enhanceShopFilter','setTimeout','clearTimeout','setInterval','requestAnimationFrame','console',source+
    '\nreturn {render,setShopView,doFilter,clearFilters,chg,setQ,addProductToCart,openCart,removeCartItem,loadProducts,openProductImage,closeProductImage,shopImageFailed,showMoreShopProducts,state:()=>({products,filtered,qtys,shopView,shopLoadState,shopAccessReady,shopVisibleCount})};');
  const app=runtime(window,document,OnPart,{getToken:()=>state.token},API,module.exports,
    ()=>()=>{},fn=>{timers.push(fn);return timers.length;},()=>{},()=>1,fn=>fn(),{warn(){},error(){}});
  return {app,state,document,nodes,dynamic,storage,calls,view:module.exports,settle:async()=>{for(let i=0;i<25;i++)await Promise.resolve();}};
}
test('cards are default; switching preserves filters, selections, and the server cart',async()=>{
  const e=createShopHarness(html,viewSource,{products});await e.settle();
  assert.equal(e.app.state().shopView,'cards');
  assert.equal(e.nodes.get('shopList').hidden,true);
  assert.equal(e.dynamic.get('productQty_1').value,'۰');
  await e.app.chg(1,1);
  assert.equal(e.state.cart[0].qty,1);
  e.app.setShopView('list');
  assert.equal(e.nodes.get('shopCards').innerHTML,'');
  assert.equal(e.dynamic.get('productQty_1').value,'۱');
  await e.app.setQ(1,'۳');
  e.app.setShopView('cards');
  assert.equal(e.app.state().qtys[1],3);
  assert.equal(e.dynamic.get('productQty_1').value,'۳');
  assert.equal(e.state.cart[0].qty,3);
  assert.equal(e.storage.get('onpart-shop-view'),'cards');
  assert.deepEqual(e.calls.filter(c=>c.save).map(c=>c.quantity),[1,3]);
});
test('both views use the same text/code search and exact car/brand/category filters',async()=>{
  const e=createShopHarness(html,viewSource,{products});await e.settle();
  for(const mode of ['cards','list']){
    e.app.setShopView(mode);
    e.nodes.get('fText').value='pola ۰۰۱';e.app.doFilter();
    assert.deepEqual(e.app.state().filtered.map(p=>p.id),[1]);
    e.nodes.get('fText').value='';e.nodes.get('fCar').value='پژو ۲۰۶';e.nodes.get('fBrand').value='خاتم';e.nodes.get('fCat').value='شلنگ بای پس';e.app.doFilter();
    assert.deepEqual(e.app.state().filtered.map(p=>p.id),[2]);
    e.nodes.get('fBrand').value='پولاسا';e.app.doFilter();
    assert.equal(e.app.state().filtered.length,0);
    assert.match(e.nodes.get(mode==='cards'?'shopCards':'tbody').innerHTML,/محصولی یافت نشد/);
    e.app.clearFilters();
    assert.equal(e.app.state().filtered.length,2);
  }
});
test('saved list preference survives navigation and blocked storage still defaults to cards',async()=>{
  const e=createShopHarness(html,viewSource,{products,storage:[['onpart-shop-view','list']]});await e.settle();
  assert.equal(e.app.state().shopView,'list');
  assert.equal(e.view.readMode({getItem(){throw Error('blocked')}}),'cards');
  assert.equal(e.view.readMode({getItem:()=> 'invalid'}),'cards');
});
test('approval and missing-session errors expose no products or prices in either view',async()=>{
  for(const config of [{products,deny:true},{products,token:null}]){
    const e=createShopHarness(html,viewSource,config);await e.settle();
    for(const mode of ['cards','list']){
      e.app.setShopView(mode);
      const markup=e.nodes.get(mode==='cards'?'shopCards':'tbody').innerHTML;
      assert.doesNotMatch(markup,/POLA-001|محصول آزمایشی یک|۱۰٬۰۰۰/);
      assert.match(markup,/تأییدشده/);
      assert.equal(e.app.state().shopAccessReady,false);
    }
  }
});
test('unavailable products cannot be added and failed cart saves roll back in both views',async()=>{
  const e=createShopHarness(html,viewSource,{products});await e.settle();
  for(const mode of ['cards','list']){
    e.app.setShopView(mode);
    await e.app.chg(2,1);
    assert.equal(e.calls.filter(c=>c.save===2).length,0);
    e.state.saveSucceeds=false;
    await e.app.chg(1,1);
    assert.equal(e.app.state().qtys[1]||0,0);
    assert.equal(e.dynamic.get('productQty_1').value,'۰');
    e.state.saveSucceeds=true;
  }
  await e.app.addProductToCart(1);
  assert.equal(e.app.state().qtys[1],1);
  e.app.openCart();
  assert.match(e.nodes.get('cartBody').innerHTML,/محصول آزمایشی یک/);
  await e.app.removeCartItem(1);
  assert.equal(e.app.state().qtys[1]||0,0);
});
test('images use the existing field, with standard fallbacks and an accessible zoom dialog',async()=>{
  const e=createShopHarness(html,viewSource,{products});await e.settle();
  assert.match(e.nodes.get('shopCards').innerHTML,/https:\/\/onpartpadmin\.liara\.run\/uploads\/test\.jpg/);
  assert.match(e.nodes.get('shopCards').innerHTML,/تصویر ثبت نشده/);
  assert.equal(e.view.imageUrl('javascript:alert(1)','https://api.test','https://shop.test'),'');
  assert.equal(e.view.imageUrl('data:image/svg+xml,unsafe','https://api.test','https://shop.test'),'');
  e.app.openProductImage(1);
  assert.equal(e.nodes.get('shopImageDialog').open,true);
  assert.equal(e.nodes.get('shopImageZoom').src,'https://onpartpadmin.liara.run/uploads/test.jpg');
  e.app.closeProductImage();
  assert.equal(e.nodes.get('shopImageDialog').open,false);
  const hidden={hidden:true,querySelector:()=>({textContent:''})},zoom={hidden:false};
  const button={disabled:false,querySelector:selector=>selector.includes('placeholder')?hidden:zoom};
  const image={hidden:false,closest:()=>button};
  e.app.shopImageFailed(image);
  assert.equal(button.disabled,true);assert.equal(hidden.hidden,false);assert.equal(image.hidden,true);
});
test('large result sets are progressively revealed without altering the loaded catalog',async()=>{
  const many=Array.from({length:65},(_,i)=>({...products[0],id:i+1,code:'TEST-'+i}));
  const e=createShopHarness(html,viewSource,{products:many});await e.settle();
  assert.equal((e.nodes.get('shopCards').innerHTML.match(/class="shop-card"/g)||[]).length,48);
  assert.equal(e.nodes.get('shopMore').hidden,false);
  e.app.showMoreShopProducts();
  assert.equal((e.nodes.get('shopCards').innerHTML.match(/class="shop-card"/g)||[]).length,65);
  assert.equal(e.nodes.get('shopMore').hidden,true);
  e.app.setShopView('list');
  assert.equal(e.app.state().filtered.length,65);
});

test('product metadata is escaped and unsafe image schemes or ids cannot create active markup',async()=>{
  const e=createShopHarness(html,viewSource,{products});await e.settle();
  const markup=e.view.renderCard({id:1,desc:'<script>alert(1)</script>',code:'"><img src=x>',brand:'<b>brand</b>',car:'<svg>',stock:true,price:10000,image:'javascript:alert(1)'},{showPrice:true,formatPrice:n=>n+' تومان'});
  assert.match(markup,/&lt;script&gt;/);assert.match(markup,/&lt;svg&gt;/);
  assert.doesNotMatch(markup,/<script>|<svg>|<img/);
  assert.equal(e.view.renderCard({id:'1 onclick=alert(1)'},{}),'');
});
test('losing the buyer session removes rendered products and the open image',async()=>{
  const e=createShopHarness(html,viewSource,{products,cart:[{product_id:1,qty:2}]});await e.settle();
  e.app.openProductImage(1);
  e.state.token=null;e.app.render();
  assert.equal(e.app.state().products.length,0);assert.equal(e.app.state().filtered.length,0);
  assert.equal(e.nodes.get('shopImageDialog').open,false);
  assert.equal(e.nodes.get('cartCountBtn').textContent,'۰');
  assert.doesNotMatch(e.nodes.get('shopCards').innerHTML,/POLA-001|محصول آزمایشی/);
});
