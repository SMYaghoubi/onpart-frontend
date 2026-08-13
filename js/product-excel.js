(function initProductExcelContract(){
  const HEADERS=Object.freeze({code:'کد محصول / OEM',description:'شرح محصول',car:'خودرو',brand:'برند',category:'گروه کالا',price:'قیمت (تومان)',availability:'وضعیت موجودی',flow:'گردش',supplier:'تأمین‌کننده'});
  const ORDER=Object.freeze(Object.values(HEADERS));
  const aliases=Object.freeze({
    code:[HEADERS.code,'کد','کد محصول','code','Code','OEM'],description:[HEADERS.description,'شرح','نام','description','Description'],
    car:[HEADERS.car,'car','Car'],brand:[HEADERS.brand,'brand','Brand'],category:[HEADERS.category,'گروه','گروه کالایی','دسته','category','Category'],
    price:[HEADERS.price,'قیمت','price','Price'],availability:[HEADERS.availability,'availability','Availability'],
    flow:[HEADERS.flow,'has_flow','flow','Flow'],supplier:[HEADERS.supplier,'supplier','supplier_id'],legacyStock:['موجودی','stock','Stock']
  });
  function value(row,key){for(const name of aliases[key]||[])if(row[name]!==undefined&&row[name]!=='')return row[name];return '';}
  function row(product,supplier=''){return {[HEADERS.code]:String(product.code??''),[HEADERS.description]:product.description||'',[HEADERS.car]:product.car||'',[HEADERS.brand]:product.brand||'',[HEADERS.category]:product.category||'',[HEADERS.price]:Number(product.price||0),[HEADERS.availability]:product.available===true?'موجود':'ناموجود',[HEADERS.flow]:Number(product.has_flow)===1?'دارد':'ندارد',[HEADERS.supplier]:supplier||''};}
  function textCodeColumn(sheet,count){for(let index=2;index<=count+1;index++){const cell=sheet[`A${index}`];if(cell){cell.t='s';cell.v=String(cell.v??'');cell.z='@';}}}
  function availability(row,index){const current=value(row,'availability'),legacy=value(row,'legacyStock');if(current!==''){const label=String(current).trim();if(!['موجود','ناموجود'].includes(label))throw new Error(`ردیف ${index}: وضعیت موجودی فقط باید «موجود» یا «ناموجود» باشد`);return {available:label==='موجود',legacy:false};}if(legacy!==''){const numeric=Number(String(legacy).replace(/[,٬\s]/g,''));if(!Number.isInteger(numeric)||numeric<0)throw new Error(`ردیف ${index}: موجودی عددی قدیمی معتبر نیست`);return {available:numeric>0,legacy:true};}throw new Error(`ردیف ${index}: ستون «${HEADERS.availability}» الزامی است`);}
  function flow(row,index,{required=false}={}){const raw=value(row,'flow');if(raw===''){if(required)throw new Error(`ردیف ${index}: ستون «${HEADERS.flow}» الزامی است`);return null;}const label=String(raw).trim();if(label==='دارد'||label==='1'||label==='true')return 1;if(label==='ندارد'||label==='0'||label==='false')return 0;throw new Error(`ردیف ${index}: گردش فقط باید «دارد» یا «ندارد» باشد`);}
  window.ProductExcel=Object.freeze({HEADERS,ORDER,aliases,value,row,textCodeColumn,availability,flow});
})();
