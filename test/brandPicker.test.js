const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require.resolve('../js/brand-picker.js'),'utf8');
function setup(){
 class Node{
  constructor(tag='div'){this.tag=tag;this.children=[];this.attributes={};this.events={};this.className='';this.classList={toggle:(name,on)=>{const list=new Set(this.className.split(' ').filter(Boolean));if(on)list.add(name);else list.delete(name);this.className=[...list].join(' ');}};}
  append(...children){this.children.push(...children);}appendChild(child){this.append(child);return child;}replaceChildren(){this.children=[];}setAttribute(key,value){this.attributes[key]=value;}addEventListener(key,fn){this.events[key]=fn;}
  querySelector(tag){for(const child of this.children){if(child.tag===tag)return child;const result=child.querySelector(tag);if(result)return result;}return null;}remove(){this.removed=true;}
 }
 const ctx=vm.createContext({window:{},API:{BASE_URL:'https://api.test.invalid'},document:{createElement:tag=>new Node(tag)}});vm.runInContext(source,ctx);const root=new Node();root.id='brands';return {render:ctx.window.BrandPicker.render,root,Node};
}
test('checkbox cards preserve multiselection across filtered rerenders, show real featured label and disable approved choices',()=>{
 const {render,root}=setup(),selected=new Set(['1']);let changed;
 const items=[{id:1,name:'approved'},{id:2,name:'chosen',featured:1},{id:3,name:'other'}];
 render(root,{items,selected,disabled:new Set(['1']),onChange:values=>changed=values});
 assert.equal(root.children[0].querySelector('input').disabled,true);const check=root.children[1].querySelector('input');check.checked=true;check.events.change();assert.deepEqual([...changed],['1','2']);assert.match(root.children[1].className,/is-selected/);assert.equal(root.children[1].querySelector('small').textContent,'منتخب مدیریت');
 render(root,{items:[items[2]],selected,onChange:values=>changed=values});const third=root.children[0].querySelector('input');third.checked=true;third.events.change();assert.deepEqual([...changed],['1','2','3']);
 render(root,{items,selected});assert.equal(root.children[1].querySelector('input').checked,true);
});
test('product cards allow exactly one brand and text remains inert; external logo URLs rejected',()=>{
 const {render,root}=setup(),selected=new Set(['1']);let changed;
 render(root,{items:[{id:1,name:'<img onerror=alert(1)>'},{id:2,name:'second',logo_url:'javascript:alert(1)'}],multiple:false,selected,onChange:values=>changed=values});
 assert.equal(root.attributes.role,'radiogroup');assert.equal(root.children[0].querySelector('b').textContent,'<img onerror=alert(1)>');assert.equal(root.children[1].querySelector('img'),null);
 const radio=root.children[1].querySelector('input');assert.equal(radio.type,'radio');radio.checked=true;radio.events.change();assert.deepEqual([...changed],['2']);
});
test('only managed logo route is used, names remain readable when image fails, and compact mobile styles exist',()=>{
 const {render,root}=setup(),logo='/api/brands/8/logo?v=12345678-1234-1234-1234-123456789abc';render(root,{items:[{id:8,name:'managed',logo_url:logo}]});const image=root.children[0].querySelector('img');assert.equal(image.src,'https://api.test.invalid'+logo);assert.equal(image.alt,'');image.events.error();assert.equal(image.removed,true);assert.equal(root.children[0].querySelector('b').textContent,'managed');
 const css=fs.readFileSync(require.resolve('../css/brand-picker.css'),'utf8');assert.match(css,/@media\(max-width:700px\)/);assert.match(css,/\.brand-logo\{/);assert.match(css,/min-height:44px/);assert.match(css,/#entryForm \.brand-picker input\[type=radio\]\{[^}]*min-height:19px/);assert.match(css,/\.fg \.brand-picker label\.brand-choice span\{color:#142742/);
});
test('admin master, registration, supplier requests and single-product entry are wired to the shared real brand list',()=>{
 const read=file=>fs.readFileSync(require.resolve('../'+file),'utf8');
 assert.match(read('js/admin.js'),/href:'\/admin\/brands'/);assert.match(read('admin/brands.html'),/managedBrandFeatured/);assert.match(read('js/admin-brands.js'),/body\.append\('logo',file\)/);
 const registration=read('cooperation.html');assert.match(registration,/\/api\/brands\/registration/);assert.match(registration,/brand_ids:\[\.\.\.selectedBrandIds\]/);assert.doesNotMatch(registration,/id="brandInp"/);
 const supplier=read('supplier/index.html');assert.match(supplier,/data-panel="brands"/);assert.match(supplier,/brandDetails=catalog\.brand_details/);assert.match(supplier,/multiple:false/);assert.doesNotMatch(supplier,/<select id="entryBrand" required/);
 assert.match(read('js/supplier-brand-requests.js'),/\/brand-requests/);assert.match(read('admin/products.html'),/loadManagedProductBrands/);assert.doesNotMatch(read('admin/products.html'),/var allBrands = \['ایساکو'/);
});
