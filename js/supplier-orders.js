(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.SupplierOrders=api;
})(typeof window==='undefined'?this:window,function(){
  const labels={preparing:'در حال آماده‌سازی',shipping:'ارسال‌شده',delivered:'تحویل‌شده',cancelled:'لغوشده'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fa=value=>String(value).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
  const money=value=>value==null?'نیازمند بررسی مدیریت':Number(value).toLocaleString('fa-IR')+' تومان';
  const status=value=>labels[value]||'نیازمند بررسی';
  const date=value=>API.formatDate(value,{withTime:true})||'—';
  let request,page=1,total=0,busy=false,sequence=0,detailSequence=0;
  const node=id=>document.getElementById(id);
  function orderCard(order){
    return '<article class="seller-order-card"><div class="seller-order-top"><b>سفارش '+fa(order.id)+'</b><span class="seller-order-status '+esc(order.status)+'">'+esc(status(order.status))+'</span></div>'
      +'<p class="hint">'+esc(date(order.created_at))+'</p>'+(order.fulfillment_policy==='shahriar_hub_post_recipient'?'<p class="hint">اقلام را با شماره سفارش به مرکز آن‌پارت در شهریار تحویل دهید؛ ارسال به خریدار توسط آن‌پارت انجام می‌شود.</p>':'')+'<dl><div><dt>اقلام مربوط به شما</dt><dd>'+fa(order.line_count)+' ردیف · '+fa(order.quantity)+' عدد</dd></div><div><dt>ارزش اقلام به قیمت همکاری شما</dt><dd>'+esc(money(order.supplier_total))+'</dd></div></dl>'
      +'<button type="button" class="seller-order-detail" data-seller-order="'+Number(order.id)+'">مشاهده اقلام سفارش</button></article>';
  }
  function itemCard(item){
    return '<article class="seller-order-item"><div><h3>'+esc(item.description||'نام ثبت نشده')+'</h3><p><bdi>'+esc(item.code||'—')+'</bdi> · '+esc(item.brand||'—')+(item.car?' · '+esc(item.car):'')+'</p></div><dl><div><dt>تعداد</dt><dd>'+fa(item.quantity)+'</dd></div><div><dt>قیمت همکاری هر عدد</dt><dd>'+esc(money(item.supplier_price))+'</dd></div><div><dt>جمع اقلام</dt><dd>'+esc(money(item.supplier_total))+'</dd></div></dl></article>';
  }
  function controls(){
    node('sellerOrderRefresh').disabled=busy;
    node('sellerOrderPrev').disabled=busy||page<=1;
    node('sellerOrderNext').disabled=busy||page*20>=total;
  }
  async function load(reset=false){
    if(!request)return;
    if(reset)page=1;
    const current=++sequence;detailSequence++;
    node('sellerOrderDetails').hidden=true;busy=true;controls();
    node('sellerOrderList').setAttribute('aria-busy','true');
    node('sellerOrderList').innerHTML='<p class="empty">در حال دریافت سفارش‌های شما…</p>';
    node('sellerOrderPage').textContent='';
    const filter=node('sellerOrderStatus').value;
    try{
      const data=await request('/orders?page='+page+(filter?'&status='+encodeURIComponent(filter):''));
      if(current!==sequence)return;
      total=Number(data.total)||0;
      if(page>1&&!(data.orders||[]).length){page=1;return load();}
      node('sellerOrderList').innerHTML=(data.orders||[]).map(orderCard).join('')||'<div class="empty-state"><p>سفارشی در این بخش ندارید.</p><small>پس از تأیید کامل پرداخت و ورود سفارش به مرحله آماده‌سازی، اقلام مربوط به شما اینجا نمایش داده می‌شوند.</small></div>';
      node('sellerOrderPager').hidden=total<=20;
      node('sellerOrderPage').textContent='صفحه '+fa(page)+' از '+fa(Math.max(1,Math.ceil(total/20)));
    }catch(error){
      if(current!==sequence)return;
      total=0;node('sellerOrderPager').hidden=true;
      node('sellerOrderList').innerHTML='<p class="error" role="alert">'+esc(error.message||'دریافت سفارش‌ها انجام نشد؛ دوباره تلاش کنید.')+'</p>';
    }finally{if(current===sequence){busy=false;node('sellerOrderList').setAttribute('aria-busy','false');controls();}}
  }
  async function show(id){
    const current=++detailSequence,panel=node('sellerOrderDetails');panel.hidden=false;
    node('sellerOrderDetailTitle').textContent='اقلام سفارش '+fa(id);
    node('sellerOrderDetailBody').innerHTML='<p class="empty">در حال دریافت جزئیات…</p>';
    node('sellerOrderDetailTitle').focus({preventScroll:true});panel.scrollIntoView({behavior:'smooth',block:'start'});
    try{
      const data=await request('/orders/'+id);if(current!==detailSequence)return;
      node('sellerOrderDetailBody').innerHTML='<p class="hint">'+esc(status(data.status))+' · '+esc(date(data.created_at))+'</p>'
        +(data.fulfillment_policy==='shahriar_hub_post_recipient'?'<p class="hint">محل تحویل: مرکز آن‌پارت در شهریار. برای هماهنگی تحویل با مدیریت تماس بگیرید؛ شماره سفارش را روی بسته درج کنید. بسته برای خریدار توسط آن‌پارت ارسال می‌شود.</p>':'')+(data.items||[]).map(itemCard).join('')+'<div class="seller-order-sum">ارزش اقلام شما: <b>'+esc(money(data.supplier_total))+'</b></div>';
    }catch(error){if(current===detailSequence)node('sellerOrderDetailBody').innerHTML='<p class="error" role="alert">'+esc(error.message||'دریافت جزئیات انجام نشد.')+'</p>';}
  }
  function init(options){
    request=options.request;
    node('sellerOrderRefresh').addEventListener('click',()=>load());
    node('sellerOrderStatus').addEventListener('change',()=>load(true));
    node('sellerOrderPrev').addEventListener('click',()=>{if(!busy&&page>1){page--;load();}});
    node('sellerOrderNext').addEventListener('click',()=>{if(!busy&&page*20<total){page++;load();}});
    node('sellerOrderList').addEventListener('click',event=>{const button=event.target.closest('[data-seller-order]');if(button)show(Number(button.dataset.sellerOrder));});
    node('sellerOrderDetailClose').addEventListener('click',()=>{
      detailSequence++;node('sellerOrderDetails').hidden=true;
      node('sellerOrderList').querySelector('[data-seller-order]')?.focus();
    });
  }
  return {init,load,orderCard,itemCard,money,status};
});
