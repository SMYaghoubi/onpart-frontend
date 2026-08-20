const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
function htmlFiles(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);if(entry.isDirectory()&&!['.git','node_modules'].includes(entry.name))return htmlFiles(full);return entry.isFile()&&entry.name.endsWith('.html')?[full]:[];});}
for(const file of htmlFiles(root)){
  const relative=path.relative(root,file).replaceAll('\\','/');
  test(`${relative} inline scripts parse`,()=>{
    const html=fs.readFileSync(file,'utf8');
    const scripts=[...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
    scripts.forEach(source=>new Function(source));
  });
}