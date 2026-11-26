(function(root){
 let config,data,selected=new Set(),busy=false,sequence=0,key=null;
 const el=id=>document.getElementById(id),esc=value=>API.escapeHtml(String(value??''));
 const status={pending:'در انتظار تأیید',approved:'تأییدشده',rejected:'ردشده'};
 function notice(text,error=false){el('supplierBrandMessage').textContent=text;el('supplierBrandMessage').classList.toggle('brand-error',error);}
 function render(){
  const query=el('supplierBrandSearch').value.trim().toLocaleLowerCase('fa-IR'),pending=(data.requests||[]).some(row=>row.status==='pending');
  const disabled=new Set(data.brands.filter(brand=>brand.approved||brand.pending||pending||busy).map(brand=>String(brand.id)));
  const checked=new Set([...selected,...data.brands.filter(brand=>brand.approved||brand.pending).map(brand=>String(brand.id))]);
  BrandPicker.render(el('supplierBrandChoices'),{items:data.brands.filter(brand=>!query||brand.name.toLocaleLowerCase('fa-IR').includes(query)).map(brand=>({...brand,hint:brand.approved?'تأییدشده':brand.pending?'در انتظار تأیید':brand.featured?'منتخب مدیریت':''})),selected:checked,disabled,onChange:values=>{selected=new Set([...values].filter(id=>!data.brands.some(brand=>String(brand.id)===id&&(brand.approved||brand.pending))));key=null;el('supplierBrandSubmit').disabled=busy||!selected.size;}});
  el('supplierBrandSubmit').disabled=busy||pending||!selected.size;
  el('supplierBrandHint').textContent=pending?'درخواست برند شما در انتظار بررسی است؛ مجوزهای قبلی همچنان برقرارند.':'برندهای فعالیتتان را انتخاب و برای مدیریت ارسال کنید. برند جدید پس از تأیید در ثبت محصول قابل استفاده می‌شود.';
  el('supplierBrandHistory').innerHTML=(data.requests||[]).map(row=>'<article class="brand-history-item"><b>درخواست '+Number(row.id).toLocaleString('fa-IR')+'</b> <span class="brand-status '+esc(row.status)+'">'+esc(status[row.status]||row.status)+'</span><div>'+row.brands.map(brand=>esc(brand.name)).join('، ')+'</div>'+(row.note?'<p>'+esc(row.note)+'</p>':'')+'</article>').join('')||'<p class="brand-note">هنوز درخواست برندی ثبت نشده است.</p>';
 }
 async function load(){
  if(!config)return;const current=++sequence;el('supplierBrandRefresh').disabled=true;notice('در حال دریافت برندها…');
  try{const response=await config.request('/brands');if(current!==sequence)return;data=response;selected.clear();key=null;render();notice('');}
  catch(error){if(current===sequence)notice(error.message||'دریافت برندها انجام نشد؛ دوباره تلاش کنید.',true);}
  finally{if(current===sequence)el('supplierBrandRefresh').disabled=false;}
 }
 async function submit(){
  if(busy||!data||!selected.size)return;busy=true;key ||= crypto.randomUUID();render();notice('در حال ارسال برندها…');
  try{const result=await config.request('/brand-requests',{method:'POST',body:JSON.stringify({brand_ids:[...selected].map(Number),request_key:key})});await load();notice(result.message);await config.onApprovedCatalogRefresh?.();}
  catch(error){notice(error.message||'ثبت درخواست انجام نشد؛ می‌توانید دوباره تلاش کنید.',true);}
  finally{busy=false;if(data)render();}
 }
 function init(options){config=options;el('supplierBrandSearch').addEventListener('input',()=>{if(data)render();});el('supplierBrandRefresh').addEventListener('click',load);el('supplierBrandSubmit').addEventListener('click',submit);}
 root.SupplierBrandRequests={init,load};
})(window);
