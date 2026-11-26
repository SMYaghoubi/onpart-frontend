(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BrandPicker=api;})(typeof window==='undefined'?this:window,function(){
 function render(container,{items=[],selected=new Set(),disabled=new Set(),multiple=true,onChange=()=>{},empty='برندی در این فهرست نیست.'}={}){
  container.replaceChildren();container.setAttribute('role',multiple?'group':'radiogroup');
  if(!items.length){const node=document.createElement('p');node.className='brand-picker-empty';node.textContent=empty;container.appendChild(node);return;}
  for(const item of items){
   const key=String(item.value??item.id),label=document.createElement('label'),input=document.createElement('input'),text=document.createElement('span'),name=document.createElement('b');
   label.className='brand-choice'+(selected.has(key)?' is-selected':'')+(disabled.has(key)?' is-disabled':'');
   input.type=multiple?'checkbox':'radio';input.name=container.id+'-brand';input.value=key;input.checked=selected.has(key);input.disabled=disabled.has(key);name.textContent=item.name;text.appendChild(name);
   const hint=item.hint||(Number(item.featured)?'منتخب مدیریت':'');if(hint){const small=document.createElement('small');small.textContent=hint;text.appendChild(small);}
   input.addEventListener('change',()=>{if(multiple){if(input.checked)selected.add(key);else selected.delete(key);}else{selected.clear();selected.add(key);}for(const card of container.children){const control=card.querySelector('input');if(control)card.classList.toggle('is-selected',selected.has(control.value));}onChange(new Set(selected));});
   if(typeof item.logo_url==='string'&&/^\/api\/brands\/\d+\/logo\?v=[0-9a-f-]{36}$/.test(item.logo_url)){const image=document.createElement('img');image.className='brand-logo';image.alt='';image.loading='lazy';image.src=API.BASE_URL+item.logo_url;image.addEventListener('error',()=>image.remove());label.append(input,image,text);}else label.append(input,text);container.appendChild(label);
  }
 }
 return {render};
});
