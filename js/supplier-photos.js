(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SupplierPhotos=api;
})(typeof window==='undefined'?this:window,function(){
  const maxBytes=5*1024*1024,cache=new Map(),tokens=new Map();
  const validId=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function validate(file){if(!file||!file.size||file.size>maxBytes)throw new Error('حجم عکس باید حداکثر ۵ مگابایت باشد');if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('عکس JPG، PNG یا WebP انتخاب کنید');return file;}
  function markup(id,label='عکس پیشنهادی'){return validId(id)?'<span class="supplier-photo"><img data-supplier-photo-id="'+id+'" alt="'+esc(label)+'" hidden><span>در حال دریافت عکس…</span></span>':'';}
  async function objectUrl(id,context){
    if(!validId(id))throw new Error('شناسهٔ عکس نامعتبر است');
    const token=OnPartSession.getToken(context);
    if(!token)throw new Error('ابتدا وارد حساب شوید');
    if(tokens.get(context)!==token){clear();tokens.set(context,token);}
    const key=context+':'+id;
    if(!cache.has(key)){
      const pending=(async()=>{
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
        try{
          const endpoint='/api/supplier-portal/'+(context==='admin'?'admin/':'')+'images/'+encodeURIComponent(id);
          const response=await fetch(API.BASE_URL+endpoint,{headers:API.headers(context),cache:'no-store',signal:controller.signal});
          if(!response.ok||!(response.headers.get('content-type')||'').startsWith('image/webp'))throw new Error('دریافت عکس انجام نشد');
          return URL.createObjectURL(await response.blob());
        }finally{clearTimeout(timer);}
      })();
      cache.set(key,pending);pending.catch(()=>{if(cache.get(key)===pending)cache.delete(key);});
    }
    return cache.get(key);
  }
  function load(container,context='supplier'){
    container.querySelectorAll('img[data-supplier-photo-id]').forEach(async image=>{
      const id=image.dataset.supplierPhotoId,placeholder=image.nextElementSibling;
      try{
        const url=await objectUrl(id,context);
        if(!image.isConnected||image.dataset.supplierPhotoId!==id)return;
        image.src=url;image.hidden=false;if(placeholder)placeholder.hidden=true;
      }catch(_){if(image.isConnected&&placeholder)placeholder.textContent='دریافت عکس انجام نشد';}
    });
  }
  function clear(){for(const promise of cache.values())promise.then(url=>URL.revokeObjectURL(url)).catch(()=>{});cache.clear();tokens.clear();}
  if(typeof window!=='undefined')window.addEventListener('pagehide',clear);
  return {maxBytes,validId,validate,markup,objectUrl,load,clear};
});

