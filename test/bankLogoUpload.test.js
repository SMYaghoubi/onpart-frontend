const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../admin/settings.html'),'utf8');

function uploader({load=true,url='/uploads/bank-logo-new.png',uploadError=false}={}){
  const previous='<img src="https://backend.test/uploads/bank-logo-old.png">';
  const preview={innerHTML:previous,replaceChildren(image){this.image=image;this.innerHTML='loaded'}};
  const status={},button={},wrap={querySelector:selector=>({'.bank-logo-preview':preview,'.bank-upload-status':status,'.bank-upload-btn':button}[selector]||null)};
  const input={files:[{size:100,type:'image/png'}],dataset:{logo:'/uploads/bank-logo-old.png'},closest:()=>wrap};
  class Image {set src(value){this.url=value;queueMicrotask(()=>load?this.onload?.():this.onerror?.())}}
  const context={Image,queueMicrotask,setTimeout,clearTimeout,FormData:class {append(){}},
    URL:{createObjectURL:()=> 'blob:preview',revokeObjectURL(){}},
    API:{safeUrl:path=>'https://backend.test'+path,request:async()=>{if(uploadError)throw new Error('upload failed');return {url}}}
  };
  vm.runInNewContext('let pendingBankLogoUploads=0;'+source.slice(source.indexOf('function loadBankLogo('),source.indexOf('setTimeout(function(){ loadSettings();')),context);
  return {context,input,preview,status,button,previous};
}

test('bank logo path is saved only after the uploaded server image actually loads',async()=>{
  const state=uploader();await state.context.previewLogo(state.input);
  assert.equal(state.input.dataset.logo,'/uploads/bank-logo-new.png');
  assert.equal(state.preview.image.url,'https://backend.test/uploads/bank-logo-new.png');
  assert.equal(state.status.className,'bank-upload-status ok');
  assert.equal(state.button.disabled,false);
  assert.equal(vm.runInNewContext('pendingBankLogoUploads',state.context),0);
});

for(const [name,options] of [['missing server file',{load:false}],['upload failure',{uploadError:true}],['invalid upload URL',{url:'https://other.test/x.png'}]]){
  test(`${name} preserves the previous saved bank logo and reports failure`,async()=>{
    const state=uploader(options);await state.context.previewLogo(state.input);
    assert.equal(state.input.dataset.logo,'/uploads/bank-logo-old.png');
    assert.equal(state.preview.innerHTML,state.previous);
    assert.equal(state.status.className,'bank-upload-status error');
    assert.equal(state.button.disabled,false);
    assert.equal(vm.runInNewContext('pendingBankLogoUploads',state.context),0);
  });
}
