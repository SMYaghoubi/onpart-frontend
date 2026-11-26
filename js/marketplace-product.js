(function(){
 const esc=value=>API.escapeHtml(String(value??'')),money=value=>Number(value).toLocaleString('fa-IR')+' تومان';
 const id=Number(new URLSearchParams(location.search).get('id')),quantities=new Map();let data,busy=false;
 const root=document.getElementById('productContent');OnPart.renderNavbar('shop');
 function imageUrl(value){if(!value)return '';const raw=value.startsWith('/uploads/')?API.BASE_URL+value:value;return API.safeUrl(raw);}
 function render(){
  const p=data.product,image=imageUrl(p.image);document.title=p.description+' | آن‌پارت';
  root.innerHTML='<section class="market-product"><div>'+(image?'<button type="button" id="zoomMaster" class="market-image-button"><img class="market-image" src="'+esc(image)+'" alt="'+esc(p.description)+'"><small>بزرگ‌نمایی تصویر</small></button>':'<div class="market-no-image">تصویر محصول ثبت نشده است</div>')+'</div><div><h1>'+esc(p.description)+'</h1><div class="market-spec"><span>'+esc(p.brand||'—')+'</span><span>کد فنی: <bdi>'+esc(p.code)+'</bdi></span>'+(p.car?'<span>'+esc(p.car)+'</span>':'')+'</div><p class="market-note">خرید ویژه همکاران تأییدشده است. کالا ابتدا در مرکز آن‌پارت در شهریار تحویل گرفته و از طرف آن‌پارت ارسال می‌شود. هزینه پست جدا از مبلغ کالا، در مقصد پرداخت می‌شود.</p></div></section>'
   +'<section class="market-offers"><h2>مقایسه قیمت فروشندگان</h2><p class="market-help">قیمت‌های نمایش‌داده‌شده، قیمت نهایی کالا با احتساب سهم آن‌پارت هستند. برای هر کالا یک پیشنهاد انتخاب می‌شود؛ انتخاب جدید جایگزین پیشنهاد قبلی همین کالا در سبد خواهد شد.</p>'
   +(data.offers.length?data.offers.map((o,index)=>'<article class="market-offer"><div><b>'+esc(o.label)+'</b><small>موجودی: '+Number(o.quantity).toLocaleString('fa-IR')+' عدد</small></div><div class="market-money">'+money(o.price)+'</div><div class="market-qty"><button type="button" data-quantity="'+index+'" data-delta="-1" aria-label="کاهش تعداد '+esc(o.label)+'">−</button><input id="offerQty'+index+'" data-input="'+index+'" value="'+(quantities.get(o.offer_token)||0)+'" inputmode="numeric" aria-label="تعداد '+esc(o.label)+'"><button type="button" data-quantity="'+index+'" data-delta="1" aria-label="افزایش تعداد '+esc(o.label)+'">+</button></div><button class="market-add" type="button" data-add="'+index+'" '+(!(quantities.get(o.offer_token)>0)||busy?'disabled':'')+'>انتخاب این فروشنده</button></article>').join(''):'<p class="market-message">فعلاً پیشنهاد تأییدشده و موجودی فعالی برای این کالا وجود ندارد.</p>')+'<button class="market-retry" type="button" id="refreshOffers">تازه‌سازی پیشنهادها</button> <a class="market-cart" href="/shop#cart">مشاهده و ثبت سبد خرید</a><p id="offerMessage" role="status" class="market-help"></p></section>';
  document.getElementById('refreshOffers').addEventListener('click',()=>{if(!busy){quantities.clear();load();}});
  if(image){const img=root.querySelector('.market-image');img?.addEventListener('error',()=>{document.getElementById('zoomMaster').outerHTML='<div class="market-no-image">تصویر در دسترس نیست</div>';});}
  if(image)document.getElementById('zoomMaster').addEventListener('click',()=>{document.getElementById('zoomImage').src=image;document.getElementById('masterZoom').showModal();});
 }
 async function load(){
  try{data=await API.request('/api/products/'+id+'/offers');const cart=await OnPart.getCart();for(const item of cart)if(item.product_id===id&&item.offer_token&&!item.needs_review)quantities.set(item.offer_token,item.qty);render();}
  catch(e){root.innerHTML='<div class="market-message market-error" role="alert">'+esc(e.message||'دریافت پیشنهادها انجام نشد')+'<p><a href="/login">ورود به حساب همکار</a></p><button type="button" class="market-retry" id="retryOffers">تلاش دوباره</button></div>';document.getElementById('retryOffers').addEventListener('click',load);}
 }
 function setQuantity(index,value){const offer=data.offers[index];if(!offer)return;const digits=String(value).replace(/[۰-۹٠-٩]/g,d=>String(d.charCodeAt(0)&15));if(!/^\d*$/.test(digits)){document.getElementById('offerQty'+index).value=quantities.get(offer.offer_token)||0;return;}quantities.set(offer.offer_token,Math.max(0,Math.min(9999,offer.quantity,Number(digits))));const input=document.getElementById('offerQty'+index);input.value=quantities.get(offer.offer_token);root.querySelector('[data-add="'+index+'"]').disabled=busy||!quantities.get(offer.offer_token);}
 root.addEventListener('click',async event=>{
  const change=event.target.closest('[data-quantity]');if(change){const index=Number(change.dataset.quantity),o=data.offers[index];setQuantity(index,(quantities.get(o.offer_token)||0)+Number(change.dataset.delta));return;}
  const add=event.target.closest('[data-add]');if(!add||busy)return;const offer=data.offers[Number(add.dataset.add)],quantity=quantities.get(offer.offer_token)||0;if(!quantity)return;
  busy=true;add.disabled=true;document.getElementById('offerMessage').textContent='در حال ذخیره پیشنهاد…';
  try{const saved=await OnPart.setCartItem(id,quantity,{offer_token:offer.offer_token,offer_version:offer.offer_version,expected_price:offer.price});if(!saved)throw Error('پیشنهاد ذخیره نشد؛ قیمت و موجودی را دوباره بررسی کنید.');document.getElementById('offerMessage').textContent='پیشنهاد و تعداد انتخاب‌شده در سبد ثبت شد.';}
  catch(e){document.getElementById('offerMessage').textContent=e.message;}
  finally{busy=false;add.disabled=false;}
 });
 root.addEventListener('change',event=>{if(event.target.matches('[data-input]'))setQuantity(Number(event.target.dataset.input),event.target.value);});
 document.getElementById('closeZoom').addEventListener('click',()=>document.getElementById('masterZoom').close());
 if(!OnPartSession.getToken('user'))root.innerHTML='<p class="market-message">برای مشاهده کالا و قیمت‌ها، با حساب همکار تأییدشده <a href="/login">وارد شوید</a>.</p>';
 else if(!Number.isSafeInteger(id)||id<=0)root.textContent='کالا یافت نشد.';else load();
})();
