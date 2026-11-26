(function(root,factory){
  const view=factory();
  if(typeof module==='object'&&module.exports) module.exports=view;
  else root.OnPartShopView=view;
})(typeof window!=='undefined'?window:this,function(){
  const preferenceKey='onpart-shop-view';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function readMode(storage){try{return storage.getItem(preferenceKey)==='list'?'list':'cards';}catch(_){return 'cards';}}
  function saveMode(storage,mode){if(!['cards','list'].includes(mode))return false;try{storage.setItem(preferenceKey,mode);}catch(_){}return true;}
  function imageUrl(value,apiBase,origin){
    try{
      const raw=String(value||'').trim();if(!raw)return '';
      const url=new URL(raw,raw.startsWith('/uploads/')?apiBase:origin);
      return ['http:','https:'].includes(url.protocol)?url.href:'';
    }catch(_){return '';}
  }
  function renderCard(p,{quantity=0,formatPrice,formatNumber=String,showPrice=false}={}){
    const id=Number(p.id);if(!Number.isSafeInteger(id)||id<1)return '';
    const q=Number(quantity)||0,name=esc(p.desc),code=esc(p.code),brand=esc(p.brand||'—');
    const image=imageUrl(p.image,'https://onpartpadmin.liara.run','https://onpart.ir');
    const unavailable=p.stock?'':' disabled';
    const price=showPrice&&p.price!=null?'<strong>'+esc(formatPrice(p.price))+'</strong>':'<a href="/login">ورود به حساب تأییدشده</a>';
    const imageMarkup=image?'<img src="'+esc(image)+'" alt="'+name+'" loading="lazy" decoding="async" onerror="shopImageFailed(this)">':'';
    return '<article class="shop-card" role="listitem" id="productRow_'+id+'">'
      +'<button class="shop-card-media" type="button" onclick="openProductImage('+id+',this)" aria-label="بزرگ‌نمایی تصویر '+name+'"'+(image?'':' disabled')+'>'
      +imageMarkup+'<span class="shop-image-placeholder"'+(image?' hidden':'')+'><i class="ti ti-photo-off" aria-hidden="true"></i><span>تصویر ثبت نشده</span></span>'
      +(image?'<span class="shop-zoom-label"><i class="ti ti-zoom-in" aria-hidden="true"></i>بزرگ‌نمایی</span>':'')+'</button>'
      +'<div class="shop-card-content"><div class="shop-card-meta"><span class="shop-brand">'+brand+'</span>'
      +'<span class="shop-stock stock-col '+(p.stock?'is-available':'is-unavailable')+'">'+(p.stock?'موجود':'ناموجود')+'</span></div>'
      +'<h2 class="shop-card-name"><a href="/product?id='+id+'">'+name+'</a></h2><a class="shop-card-offers" href="/product?id='+id+'">مقایسه '+esc(formatNumber(p.offer_count||0))+' پیشنهاد</a>'
      +'<dl class="shop-card-spec"><div><dt>کد فنی</dt><dd><bdi dir="ltr">'+code+'</bdi></dd></div>'
      +(p.car?'<div><dt>خودرو</dt><dd>'+esc(p.car)+'</dd></div>':'')+'</dl>'
      +'<div class="shop-card-price"><span>قیمت همکاری — '+(p.selected_offer?'پیشنهاد انتخابی':'از')+'</span>'+(p.price==null?'بدون پیشنهاد فعال':price)+'</div>'
      +'<div class="shop-card-quantity"><span>تعداد</span><div class="qty-wrap" id="productQtyWrap_'+id+'">'
      +'<button class="qbtn" type="button" onclick="chg('+id+',-1)" aria-label="کاهش تعداد '+name+'"'+unavailable+'>−</button>'
      +'<input class="qinp" id="productQty_'+id+'" value="'+esc(formatNumber(q))+'" onchange="setQ('+id+',this.value)" aria-label="تعداد '+name+'" inputmode="numeric"'+unavailable+'>'
      +'<button class="qbtn" type="button" onclick="chg('+id+',1)" aria-label="افزایش تعداد '+name+'"'+unavailable+'>+</button>'
      +'<span class="qty-status" id="productQtyStatus_'+id+'" aria-live="polite"></span></div></div>'
      +'<div class="shop-card-total" id="productTotal_'+id+'">'+''+'</div>'
      +'<button class="shop-add" id="productAdd_'+id+'" type="button" onclick="location.href=\'/product?id='+id+'\'"'+unavailable+'>'
      +(p.stock?'مقایسه و انتخاب پیشنهاد':'بدون پیشنهاد فعال')+'</button></div></article>';
  }
  return {readMode,saveMode,imageUrl,renderCard};
});

