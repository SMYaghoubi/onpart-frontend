const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');

for(const file of ['shop.html','admin/orders.html','admin/supplier-access.html','admin/supplier-updates.html']){
  test(`${file} inline scripts parse`,()=>{
    const html=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
    const scripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
    scripts.forEach(source=>new Function(source));
  });
}
