const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync(require.resolve('../js/admin.js'),'utf8');
test('closed mobile admin drawer is fully outside viewport and inert',()=>{
  assert.match(source,/translate3d\(calc\(100% \+ 32px\),0,0\)!important/);
  assert.match(source,/opacity:0!important;visibility:hidden!important;pointer-events:none!important/);
  assert.match(source,/sidebar\.open\{transform:translate3d\(0,0,0\)!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important/);
});
test('admin content remains one viewport wide at mobile breakpoints',()=>{
  assert.match(source,/@media\(max-width:768px\)/);
  assert.match(source,/\.main\{display:block!important;flex:none!important;width:100%!important;max-width:100vw!important/);
  assert.match(source,/\.stats\{grid-template-columns:1fr!important\}/);
  assert.match(source,/\.table-wrap,\.table-card\{width:100%!important;max-width:100%!important;overflow-x:auto!important/);
});
test('drawer controls support backdrop, toggle and Escape',()=>{
  assert.match(source,/\[data-admin-sidebar-toggle\],\[data-admin-sidebar-close\],#sidebarOverlay/);
  assert.match(source,/if\(this\._sidebarEventsBound\) return/);
  assert.match(source,/event\.key==='Escape'/);
  assert.match(source,/classList\.add\('open'\)/);
  assert.match(source,/classList\.remove\('open'\)/);
});