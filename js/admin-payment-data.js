(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.AdminPaymentData=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STATUS_ALIASES=Object.freeze({
    pending:'pending',
    pending_review:'pending',
    submitted:'pending',
    approved:'approved',
    paid:'approved',
    rejected:'rejected'
  });

  function normalizePayment(row){
    const source=row&&typeof row==='object'?row:{};
    const rawStatus=String(source.status||'').trim().toLowerCase();
    return {
      ...source,
      id:Number(source.id)||source.id,
      order_id:source.order_id==null?null:Number(source.order_id)||source.order_id,
      amount:Number(source.amount)||0,
      allocated_amount:Number(source.allocated_amount)||0,
      unallocated_amount:Number(source.unallocated_amount)||0,
      status:STATUS_ALIASES[rawStatus]||rawStatus
    };
  }

  function parseResponse(payload){
    const rows=Array.isArray(payload)?payload:payload&&Array.isArray(payload.payments)?payload.payments:null;
    if(!rows)throw new TypeError('پاسخ فهرست پرداخت‌ها معتبر نیست');
    return rows.map(normalizePayment);
  }

  function isSameMonth(value,now){
    if(!value)return false;
    const date=new Date(value);
    return !Number.isNaN(date.getTime())&&date.getFullYear()===now.getFullYear()&&date.getMonth()===now.getMonth();
  }

  function summarize(rows,now=new Date()){
    const payments=Array.isArray(rows)?rows:[];
    const pending=payments.filter(row=>row.status==='pending');
    const approved=payments.filter(row=>row.status==='approved');
    return {
      pendingCount:pending.length,
      approvedMonthSum:approved.filter(row=>isSameMonth(row.reviewed_at||row.created_at||row.pay_date,now)).reduce((sum,row)=>sum+Number(row.amount||0),0),
      rejectedCount:payments.filter(row=>row.status==='rejected').length,
      totalSum:payments.reduce((sum,row)=>sum+Number(row.amount||0),0)
    };
  }

  function filter(rows,{search='',bank='',status=''}={}){
    const needle=String(search||'').trim().toLocaleLowerCase('fa-IR');
    return (Array.isArray(rows)?rows:[]).filter(row=>
      (!needle||String(row.user_name||'').toLocaleLowerCase('fa-IR').includes(needle)||String(row.track_number||'').toLocaleLowerCase('fa-IR').includes(needle))&&
      (!bank||row.bank===bank)&&(!status||row.status===status)
    );
  }

  return {STATUS_ALIASES,normalizePayment,parseResponse,summarize,filter};
});